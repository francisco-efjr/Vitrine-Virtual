import 'server-only'
import { getServerEnv } from '@/lib/env'
import { logger } from '@/lib/logger'

/**
 * Fabric type classifier — research §4.3 P2.11.
 *
 * Detecta o material da peça (couro, seda, denim, malha, algodão, etc) via
 * Gemini Vision e devolve uma hint composada pra injetar no prompt do
 * try-on. Cada material tem comportamento de drape, brilho e textura
 * diferente — mencionar isso explicitamente no prompt empurra o modelo
 * pra renderizar corretamente.
 *
 * Sem dep nova. Mesma estratégia de Gemini Vision dos outros classifiers
 * (garment-text, conflicting-garment).
 */

const VISION_MODEL = 'gemini-2.5-flash'
const VISION_TIMEOUT_MS = 10_000

export type FabricType =
  | 'leather'
  | 'silk'
  | 'denim'
  | 'knit'
  | 'cotton'
  | 'wool'
  | 'satin'
  | 'velvet'
  | 'linen'
  | 'synthetic'
  | 'unknown'

const VALID_FABRICS: FabricType[] = [
  'leather',
  'silk',
  'denim',
  'knit',
  'cotton',
  'wool',
  'satin',
  'velvet',
  'linen',
  'synthetic',
  'unknown',
]

const FABRIC_PROMPT = `You are looking at a single image of a clothing garment.
Identify the most likely fabric/material from the visible texture and sheen.

Respond with ONLY a single JSON object — no markdown, no prose:
{
  "fabric": "leather" | "silk" | "denim" | "knit" | "cotton" | "wool" | "satin" | "velvet" | "linen" | "synthetic" | "unknown",
  "confidence": 0.0 to 1.0
}

Decision rules:
- "leather"   — matte to glossy sheen, stiff structured drape
- "silk"      — high gloss, fluid drape, refractive highlights
- "denim"     — visible twill weave, indigo/blue typical, stiff
- "knit"      — visible stitches, stretchy drape (sweaters, tees)
- "cotton"    — matte plain weave, soft natural drape
- "wool"      — visible texture/nap, dense
- "satin"     — very high gloss, smooth (lining, dressy)
- "velvet"    — short pile, light-absorbing depth, plush
- "linen"     — coarse weave, wrinkles, matte
- "synthetic" — polyester, nylon, athleisure look
- "unknown"   — cannot determine confidently

Output JSON only.`

export interface FabricResult {
  fabric: FabricType
  confidence: number
  source: 'gemini-vision' | 'unavailable'
  detail?: string
}

interface FabricPayload {
  fabric: FabricType
  confidence: number
}

export async function classifyFabric(
  buffer: Buffer,
  mimeType: string = 'image/jpeg',
): Promise<FabricResult> {
  try {
    const env = getServerEnv()
    const apiKey = env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      return { fabric: 'unknown', confidence: 0, source: 'unavailable', detail: 'no_api_key' }
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${VISION_MODEL}:generateContent`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), VISION_TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: FABRIC_PROMPT },
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
          fabric: 'unknown',
          confidence: 0,
          source: 'unavailable',
          detail: `gemini_${res.status}`,
        }
      }
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      if (!raw) {
        return { fabric: 'unknown', confidence: 0, source: 'unavailable', detail: 'empty_response' }
      }
      const parsed = JSON.parse(raw) as Partial<FabricPayload>
      const fabric = VALID_FABRICS.includes(parsed.fabric as FabricType)
        ? (parsed.fabric as FabricType)
        : 'unknown'
      const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0))
      return { fabric, confidence, source: 'gemini-vision' }
    } finally {
      clearTimeout(timer)
    }
  } catch (err) {
    logger.warn('fabric-classify: falhou', {
      message: err instanceof Error ? err.message : String(err),
    })
    return { fabric: 'unknown', confidence: 0, source: 'unavailable', detail: 'exception' }
  }
}

/**
 * Constrói uma cláusula de prompt descritiva por fabric. Vazia pra unknown
 * ou confidence baixa.
 */
export function fabricPromptClause(fabric: FabricType, confidence: number): string {
  if (fabric === 'unknown' || confidence < 0.6) return ''
  const descriptions: Record<Exclude<FabricType, 'unknown'>, string> = {
    leather:
      'FABRIC: leather. Render with characteristic semi-glossy sheen, stiff structured drape, sharp creases at flex points.',
    silk:
      'FABRIC: silk. Render with high gloss, fluid drape, soft refractive highlights catching the light.',
    denim:
      'FABRIC: denim. Render with visible twill weave, matte finish, stiff structured drape.',
    knit:
      'FABRIC: knit. Render with visible stitch pattern, stretchy drape conforming to body curves.',
    cotton:
      'FABRIC: cotton. Render with soft matte finish, natural relaxed drape.',
    wool:
      'FABRIC: wool. Render with visible textured nap, dense matte finish, structured drape.',
    satin:
      'FABRIC: satin. Render with very high gloss, smooth surface, prominent highlights.',
    velvet:
      'FABRIC: velvet. Render with short plush pile, deep light-absorbing tones, subtle directional sheen.',
    linen:
      'FABRIC: linen. Render with coarse visible weave, natural wrinkles, matte finish.',
    synthetic:
      'FABRIC: synthetic (polyester/nylon). Render with smooth athletic finish, slight sheen, structured drape.',
  }
  return descriptions[fabric]
}
