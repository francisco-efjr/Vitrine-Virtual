import 'server-only'
import { getServerEnv } from '@/lib/env'
import { logger } from '@/lib/logger'

/**
 * Age estimation — research §4.3 P2.16 / LGPD.
 *
 * Estima faixa etária via Gemini Vision pra adicionar uma camada de
 * proteção quando o cliente parece ser menor de idade. Quando o
 * estimador retorna "minor" ou "uncertain_minor" com confiança alta,
 * a UI deve exigir consentimento parental explícito antes da geração.
 *
 * NÃO É detecção biométrica nem identificação — é classificação
 * sociológica (criança/adolescente/adulto). Não armazenamos a estimativa
 * (ADR 0006), só logamos pro audit trail.
 *
 * Quando ativado (TRY_ON_AGE_GATE=true), o use-case bloqueia a geração
 * com erro `parental_consent_required` se a estimativa for minor e o
 * cliente não tiver marcado o consentimento parental no UI.
 */

const VISION_MODEL = 'gemini-2.5-flash'
const VISION_TIMEOUT_MS = 10_000

export type AgeBracket = 'adult' | 'uncertain' | 'minor'

const AGE_PROMPT = `You are looking at a photo of a person.
Estimate their age bracket SOLELY for the purpose of determining whether parental consent might be required for a virtual try-on. Do NOT attempt to identify the person.

Respond with ONLY a single JSON object — no markdown, no prose:
{
  "bracket": "adult" | "uncertain" | "minor",
  "confidence": 0.0 to 1.0
}

Decision rules:
- "adult"      — clearly appears 18 or older (mature features, body proportions)
- "minor"      — clearly appears under 18 (child or young teen features)
- "uncertain" — could plausibly be either side of 18 (16-22 age range, ambiguous features)

Be CONSERVATIVE — when in doubt, return "uncertain". False-minor is better than false-adult.

Output JSON only.`

export interface AgeEstimationResult {
  bracket: AgeBracket
  confidence: number
  source: 'gemini-vision' | 'unavailable'
  detail?: string
}

interface AgePayload {
  bracket: AgeBracket
  confidence: number
}

export async function estimateAge(
  buffer: Buffer,
  mimeType: string = 'image/jpeg',
): Promise<AgeEstimationResult> {
  try {
    const env = getServerEnv()
    const apiKey = env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      return { bracket: 'uncertain', confidence: 0, source: 'unavailable', detail: 'no_api_key' }
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
                { text: AGE_PROMPT },
                { inlineData: { mimeType, data: buffer.toString('base64') } },
              ],
            },
          ],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        }),
        signal: controller.signal,
      })
      if (!res.ok) {
        return {
          bracket: 'uncertain',
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
        return {
          bracket: 'uncertain',
          confidence: 0,
          source: 'unavailable',
          detail: 'empty_response',
        }
      }
      const parsed = JSON.parse(raw) as Partial<AgePayload>
      const validBrackets: AgeBracket[] = ['adult', 'uncertain', 'minor']
      const bracket = validBrackets.includes(parsed.bracket as AgeBracket)
        ? (parsed.bracket as AgeBracket)
        : 'uncertain'
      const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0))
      return { bracket, confidence, source: 'gemini-vision' }
    } finally {
      clearTimeout(timer)
    }
  } catch (err) {
    logger.warn('age-estimation: falhou', {
      message: err instanceof Error ? err.message : String(err),
    })
    return { bracket: 'uncertain', confidence: 0, source: 'unavailable', detail: 'exception' }
  }
}

/**
 * Decide se a geração requer consentimento parental.
 *
 * Conservador:
 *   - bracket='minor' com confidence ≥ 0.5 → consent required
 *   - bracket='uncertain' com confidence ≥ 0.7 → consent required
 *     (estimador tá confiante de que é incerto = caso fronteiriço)
 */
export function requiresParentalConsent(result: AgeEstimationResult): boolean {
  if (result.source === 'unavailable') return false
  if (result.bracket === 'minor' && result.confidence >= 0.5) return true
  if (result.bracket === 'uncertain' && result.confidence >= 0.7) return true
  return false
}
