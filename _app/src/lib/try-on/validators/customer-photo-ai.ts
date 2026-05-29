import 'server-only'
import { getServerEnv } from '@/lib/env'
import { logger } from '@/lib/logger'
import type { CustomerPhotoSignals } from '@/lib/try-on/quality-gate/types'
import type { RejectionReason } from '@/lib/try-on/quality-gate/rejection-messages'

/**
 * Server-side AI validation da foto do cliente (request v6).
 *
 * Por quê:
 *   - Cliente roda MediaPipe no browser (best-effort, pode falhar/ser
 *     skipado em Safari iOS antigo / GPU bloqueada / extension blocker).
 *   - Servidor precisa de uma fonte de verdade independente antes de
 *     gastar uma chamada paga ao Nano Banana com foto inválida.
 *
 * Estratégia híbrida (do mais confiável pro mais barato):
 *   1. Gemini Vision (gemini-2.5-flash, no-image-gen) — análise vision
 *      "há rosto humano claro? corpo visível? quantas pessoas?". Retorna
 *      JSON estruturado. ~1.5s, ~$0.0005/foto.
 *   2. Fallback: client signals (MediaPipe que veio do navegador). Aceitos
 *      mesmo sendo "best-effort" — melhor que nada.
 *   3. Último recurso: proceed permissivo. NUNCA rejeitamos só por erro
 *      de infra (rate-limit, network) — qualidade UX > paranoia.
 *
 * Decisão de design:
 *   - Bloqueamos HARD apenas com VEREDITO POSITIVO de inválido por uma
 *     fonte confiável. Erro de infra = passa.
 *   - Mensagens já existem em rejection-messages.ts; reaproveitamos.
 */

export interface CustomerPhotoAiValidation {
  /** True = upload pode prosseguir. False = bloquear com `reason` + copy. */
  valid: boolean
  /** Razão estável pra mapear pra rejection-messages.ts (PT-BR copy). */
  reason?: RejectionReason
  /** Quem decidiu (auditoria/dashboard). */
  source: 'gemini-vision' | 'client-signals' | 'permissive-fallback'
  /** Debugging detail — nunca exposto ao cliente. */
  detail?: string
  /** Output bruto pro log estruturado. */
  raw?: Record<string, unknown>
}

interface GeminiVisionVerdict {
  has_face: boolean
  face_clarity: 'clear' | 'partial' | 'obscured' | 'none'
  person_count: number
  body_visibility: 'full_body' | 'three_quarter' | 'upper_body' | 'head_only' | 'no_body'
  image_quality: 'good' | 'acceptable' | 'blurry' | 'too_dark' | 'too_bright'
}

const VISION_PROMPT = `Analyze this photo of a person taken for a virtual fashion try-on. Respond with ONLY a single JSON object — no markdown, no prose, no explanation.

Schema (every key required, exact spelling, exact value vocabulary):
{
  "has_face": boolean,
  "face_clarity": "clear" | "partial" | "obscured" | "none",
  "person_count": integer (0, 1, 2, 3+...),
  "body_visibility": "full_body" | "three_quarter" | "upper_body" | "head_only" | "no_body",
  "image_quality": "good" | "acceptable" | "blurry" | "too_dark" | "too_bright"
}

Decision rules — apply STRICTLY:
- has_face = true ONLY if a real human face (skin, eyes, mouth) is visible. Not covered by mask, hands, phone, etc.
- face_clarity "clear" = unambiguous facial features. "partial" = side angle or partially covered. "obscured" = present but hard to read. "none" = no face.
- person_count counts ONLY DISTINCT LIVE HUMANS PHYSICALLY PRESENT in the foreground of the scene.
  • DO NOT count: mannequins, dolls, statues, busts.
  • DO NOT count: posters, billboards, magazine covers, framed photos, art prints, advertising images on walls.
  • DO NOT count: people printed or drawn on garments (t-shirt graphics, brand logos with faces, animal prints).
  • DO NOT count: reflections of the same person in mirrors, windows or glass — a person and their reflection = 1 person.
  • DO NOT count: faces shown on a phone, tablet, TV, or computer screen.
  • DO NOT count: people partially visible only in deep background (more than 5 meters away or blurry).
  • Only count: a separate, real, foreground human standing/sitting/posing in the same physical scene as the main subject.
  • When in doubt between 1 and 2, prefer 1 — false rejects hurt UX more than false accepts.
- body_visibility describes the LARGEST visible foreground person.
- image_quality "good" = sharp + well lit. "blurry" = motion blur or out of focus. "too_dark"/"too_bright" = uncorrectable exposure. "acceptable" = usable but not great.

Output the JSON object only.`

const VISION_MODEL = 'gemini-2.5-flash'
const VISION_TIMEOUT_MS = 15_000

/**
 * Valida a foto do cliente. Híbrido Gemini Vision (primary) + client signals
 * (fallback). Nunca lança — sempre retorna um CustomerPhotoAiValidation.
 *
 * O caller decide o que fazer com `valid: false` (geralmente rejeita o
 * upload no use-case com `gate_rejected` + reason).
 */
export async function validateCustomerPhotoWithAi(
  buffer: Buffer,
  mimeType: string,
  clientSignals: CustomerPhotoSignals | null,
): Promise<CustomerPhotoAiValidation> {
  // Tier 1 — Gemini Vision.
  try {
    const verdict = await callGeminiVision(buffer, mimeType)
    const decision = decideFromVision(verdict)
    logger.info('Customer photo AI: Gemini Vision decided', {
      valid: decision.valid,
      reason: decision.reason ?? null,
      verdict,
    })
    return { ...decision, source: 'gemini-vision', raw: verdict as unknown as Record<string, unknown> }
  } catch (err) {
    logger.warn('Customer photo AI: Gemini Vision falhou — tentando fallback', {
      message: err instanceof Error ? err.message : String(err),
    })
  }

  // Tier 2 — client signals (MediaPipe que veio do browser).
  if (clientSignals) {
    const decision = decideFromClientSignals(clientSignals)
    logger.info('Customer photo AI: fallback para client signals', {
      valid: decision.valid,
      reason: decision.reason ?? null,
      personCount: clientSignals.personCount,
      faceVisible: clientSignals.faceVisible,
    })
    return { ...decision, source: 'client-signals' }
  }

  // Tier 3 — sem nada confiável. UX > paranoia: deixa passar e loga.
  logger.warn('Customer photo AI: sem Gemini Vision nem client signals — passa permissivo')
  return {
    valid: true,
    source: 'permissive-fallback',
    detail: 'No AI signals available; proceeding without server-side validation',
  }
}

async function callGeminiVision(buffer: Buffer, mimeType: string): Promise<GeminiVisionVerdict> {
  const env = getServerEnv()
  const apiKey = env.GOOGLE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY não configurada')

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
              { text: VISION_PROMPT },
              { inlineData: { mimeType, data: buffer.toString('base64') } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.05,
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Gemini Vision ${res.status}: ${body.slice(0, 200)}`)
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!text) throw new Error('Gemini Vision: resposta sem texto')

    const parsed = JSON.parse(text) as Partial<GeminiVisionVerdict>
    if (
      typeof parsed.has_face !== 'boolean' ||
      typeof parsed.face_clarity !== 'string' ||
      typeof parsed.person_count !== 'number' ||
      typeof parsed.body_visibility !== 'string' ||
      typeof parsed.image_quality !== 'string'
    ) {
      throw new Error('Gemini Vision: JSON malformado ou schema incompleto')
    }
    return parsed as GeminiVisionVerdict
  } finally {
    clearTimeout(timer)
  }
}

function decideFromVision(
  v: GeminiVisionVerdict,
): { valid: boolean; reason?: RejectionReason; detail?: string } {
  if (v.person_count === 0) {
    return { valid: false, reason: 'no_person', detail: 'Gemini Vision: 0 pessoas detectadas' }
  }
  if (v.person_count > 1) {
    return {
      valid: false,
      reason: 'multiple_people',
      detail: `Gemini Vision: ${v.person_count} pessoas detectadas`,
    }
  }
  if (!v.has_face || v.face_clarity === 'none' || v.face_clarity === 'obscured') {
    return {
      valid: false,
      reason: 'no_face',
      detail: `Gemini Vision: face_clarity=${v.face_clarity}`,
    }
  }
  if (v.body_visibility === 'no_body' || v.body_visibility === 'head_only') {
    return {
      valid: false,
      reason: 'partial_body',
      detail: `Gemini Vision: body_visibility=${v.body_visibility}`,
    }
  }
  if (v.image_quality === 'blurry') {
    return {
      valid: false,
      reason: 'too_blurry',
      detail: 'Gemini Vision: image_quality=blurry',
    }
  }
  if (v.image_quality === 'too_dark' || v.image_quality === 'too_bright') {
    return {
      valid: false,
      reason: 'bad_lighting',
      detail: `Gemini Vision: image_quality=${v.image_quality}`,
    }
  }
  return { valid: true }
}

function decideFromClientSignals(
  s: CustomerPhotoSignals,
): { valid: boolean; reason?: RejectionReason; detail?: string } {
  if (s.personCount === 0) {
    return { valid: false, reason: 'no_person', detail: 'MediaPipe client: personCount=0' }
  }
  if (s.personCount > 1) {
    return { valid: false, reason: 'multiple_people', detail: 'MediaPipe client: personCount>1' }
  }
  if (!s.faceVisible || s.faceAreaFraction < 0.01) {
    return { valid: false, reason: 'no_face', detail: 'MediaPipe client: face não detectada' }
  }
  // Sharpness check — Laplacian variance < 20 ≈ borrão sólido.
  if (s.sharpness < 20) {
    return { valid: false, reason: 'too_blurry', detail: `MediaPipe client: sharpness=${s.sharpness.toFixed(1)}` }
  }
  return { valid: true }
}
