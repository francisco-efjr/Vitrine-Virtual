import 'server-only'
import { getServerEnv } from '@/lib/env'
import { logger } from '@/lib/logger'

/**
 * Conflicting garment detection — cenários §2.3 C19.
 *
 * Quando o cliente já está vestindo uma peça da MESMA categoria da peça
 * que ele tá experimentando (e.g. blusa + nova blusa, calça + nova calça),
 * o modelo de try-on tende a misturar as duas — fica com o look ambíguo,
 * ou colagem. Detectamos isso pre-gen pra avisar (UI follow-up) e logar
 * pra dashboard de calibração.
 *
 * Implementação via Gemini Vision (já integrado em customer-photo-ai +
 * garment-text). Classificação simples — só perguntamos quais categorias
 * o cliente está usando. Sem dep nova.
 */

const VISION_MODEL = 'gemini-2.5-flash'
const VISION_TIMEOUT_MS = 10_000

export type GarmentCategory =
  | 'tops'
  | 'bottoms'
  | 'one-pieces'
  | 'outerwear'
  | 'swimwear'
  | 'accessories'

const CATEGORIES_PROMPT = `You are looking at a photo of a person.
List which clothing categories you can clearly see them WEARING right now.

Respond with ONLY a single JSON object — no markdown, no prose:
{
  "categories": ["tops", "bottoms", ...]
}

Valid category values (use exact strings):
  - "tops"        — t-shirt, blouse, shirt, sweater (worn on torso)
  - "bottoms"     — pants, jeans, shorts, skirt (worn on lower body)
  - "one-pieces"  — dress, jumpsuit, romper (single garment covering top+bottom)
  - "outerwear"   — jacket, coat, blazer (over tops)
  - "swimwear"    — bikini, swimsuit
  - "accessories" — visible hat, sunglasses, scarf, bag, belt (not jewelry)

Rules:
- Only categories you can CLEARLY see. If ambiguous (e.g. you can't tell if it's a dress or top+skirt), prefer the more specific one if visible.
- Return empty array if you cannot see the person clearly.

Output JSON only.`

export interface CurrentOutfitResult {
  categories: GarmentCategory[]
  source: 'gemini-vision' | 'unavailable'
  detail?: string
}

interface OutfitPayload {
  categories: GarmentCategory[]
}

export async function detectCurrentOutfit(
  buffer: Buffer,
  mimeType: string = 'image/jpeg',
): Promise<CurrentOutfitResult> {
  try {
    const env = getServerEnv()
    const apiKey = env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      return { categories: [], source: 'unavailable', detail: 'no_api_key' }
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${VISION_MODEL}:generateContent`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), VISION_TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: CATEGORIES_PROMPT },
                { inlineData: { mimeType, data: buffer.toString('base64') } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      })
      if (!res.ok) {
        return {
          categories: [],
          source: 'unavailable',
          detail: `gemini_${res.status}`,
        }
      }
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      if (!raw) {
        return { categories: [], source: 'unavailable', detail: 'empty_response' }
      }
      const parsed = JSON.parse(raw) as Partial<OutfitPayload>
      const validCategories: GarmentCategory[] = [
        'tops',
        'bottoms',
        'one-pieces',
        'outerwear',
        'swimwear',
        'accessories',
      ]
      const filtered = (parsed.categories ?? []).filter((c): c is GarmentCategory =>
        validCategories.includes(c as GarmentCategory),
      )
      return { categories: filtered, source: 'gemini-vision' }
    } finally {
      clearTimeout(timer)
    }
  } catch (err) {
    logger.warn('conflicting-garment: classificação falhou', {
      message: err instanceof Error ? err.message : String(err),
    })
    return { categories: [], source: 'unavailable', detail: 'exception' }
  }
}

/**
 * Verdadeiro quando a peça nova é da MESMA categoria de alguma que o cliente
 * já está vestindo. Trata one-pieces e tops como conflitantes (one-piece
 * substitui top+bottom), idem outerwear+tops.
 */
export function categoriesConflict(
  currentOutfit: GarmentCategory[],
  newGarment: GarmentCategory,
): boolean {
  if (currentOutfit.includes(newGarment)) return true
  // Casos especiais de conflito cruzado
  if (newGarment === 'one-pieces' && (currentOutfit.includes('tops') || currentOutfit.includes('bottoms'))) {
    return true
  }
  if (currentOutfit.includes('one-pieces') && (newGarment === 'tops' || newGarment === 'bottoms')) {
    return true
  }
  return false
}

export interface ConflictResult {
  conflict: boolean
  currentOutfit: GarmentCategory[]
  newGarment: GarmentCategory | 'auto'
  source: 'gemini-vision' | 'unavailable'
}

export async function checkConflictingGarment(
  customerBuffer: Buffer,
  newGarmentCategory: GarmentCategory | 'auto',
): Promise<ConflictResult> {
  if (newGarmentCategory === 'auto') {
    // Não sabemos a categoria-alvo → não há conflito determinístico
    return { conflict: false, currentOutfit: [], newGarment: 'auto', source: 'gemini-vision' }
  }
  const outfit = await detectCurrentOutfit(customerBuffer)
  if (outfit.source === 'unavailable') {
    return {
      conflict: false,
      currentOutfit: [],
      newGarment: newGarmentCategory,
      source: 'unavailable',
    }
  }
  return {
    conflict: categoriesConflict(outfit.categories, newGarmentCategory),
    currentOutfit: outfit.categories,
    newGarment: newGarmentCategory,
    source: 'gemini-vision',
  }
}
