import 'server-only'
import { getServerEnv } from '@/lib/env'
import { logger } from '@/lib/logger'

/**
 * Garment text detection via Gemini Vision — research §14 / P0.4.
 *
 * Por que Gemini em vez de Tesseract.js:
 *   - tesseract.js + traineddata empacotam ~150MB em node_modules. Inviável
 *     pro tamanho da função serverless Vercel.
 *   - Gemini 2.5 Flash já está integrado, custa ~$0.0005/foto, e lê fontes
 *     estilizadas (logo, texto em camiseta) muito melhor que Tesseract.
 *   - Privacidade não é problema: a foto da peça vem do catálogo da loja,
 *     não do cliente.
 *
 * Uso:
 *   - P0.4 (best-of-N): chama `detectGarmentText(garmentBuf)` no input
 *     da peça pra decidir se vale ativar best-of-N.
 *   - P1.6 (text fidelity): chama `detectGarmentText(resultBuf)` no output
 *     e compara com edit distance.
 */

const VISION_MODEL = 'gemini-2.5-flash'
const VISION_TIMEOUT_MS = 12_000
const MIN_TEXT_LENGTH = 2

const OCR_PROMPT = `You are looking at a single image of a clothing garment (top, dress, jacket, etc.).
Extract any visible text, brand logos, or written letters from the garment surface.

Respond with ONLY a single JSON object — no markdown, no prose:
{
  "text": "<all extracted text, joined by single spaces, in original casing>",
  "has_text": boolean
}

Rules:
- has_text = true if there's any legible text, logo lettering, or brand wordmark.
- Ignore care-instruction tags or background prints not on the garment.
- If no text, return { "text": "", "has_text": false }.
- Preserve original casing and characters exactly. Do NOT translate.

Output JSON only.`

export interface GarmentTextResult {
  text: string
  hasText: boolean
  source: 'gemini-vision' | 'unavailable'
  detail?: string
}

interface GeminiOcrPayload {
  text: string
  has_text: boolean
}

/**
 * Detecta texto/logo na peça. Nunca lança — falha silenciosa retorna
 * `source: 'unavailable'` e o caller decide (default: no-op no best-of-N).
 */
export async function detectGarmentText(
  buffer: Buffer,
  mimeType: string = 'image/jpeg',
): Promise<GarmentTextResult> {
  try {
    const env = getServerEnv()
    const apiKey = env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      return { text: '', hasText: false, source: 'unavailable', detail: 'no_api_key' }
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
                { text: OCR_PROMPT },
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
        const body = await res.text().catch(() => '')
        return {
          text: '',
          hasText: false,
          source: 'unavailable',
          detail: `gemini_${res.status}_${body.slice(0, 80)}`,
        }
      }
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      if (!raw) {
        return { text: '', hasText: false, source: 'unavailable', detail: 'empty_response' }
      }
      const parsed = JSON.parse(raw) as Partial<GeminiOcrPayload>
      if (typeof parsed.text !== 'string' || typeof parsed.has_text !== 'boolean') {
        return { text: '', hasText: false, source: 'unavailable', detail: 'invalid_schema' }
      }
      const trimmed = parsed.text.trim()
      return {
        text: trimmed,
        // Considera "has text" tanto pelo flag do model quanto por sanidade no
        // length — evita "has_text=true; text=''" em borderlines.
        hasText: parsed.has_text && trimmed.length >= MIN_TEXT_LENGTH,
        source: 'gemini-vision',
      }
    } finally {
      clearTimeout(timer)
    }
  } catch (err) {
    logger.warn('garment-text: OCR falhou', {
      message: err instanceof Error ? err.message : String(err),
    })
    return {
      text: '',
      hasText: false,
      source: 'unavailable',
      detail: 'exception',
    }
  }
}

/**
 * Levenshtein distance case-insensitive. O(|a|·|b|), suficiente pra textos
 * curtos (logos, brand wordmarks).
 */
export function editDistance(a: string, b: string): number {
  const s = a.toLowerCase().trim()
  const t = b.toLowerCase().trim()
  const m = s.length
  const n = t.length
  if (m === 0) return n
  if (n === 0) return m

  let prev = new Array(n + 1)
  let curr = new Array(n + 1)
  for (let j = 0; j <= n; j += 1) prev[j] = j

  for (let i = 1; i <= m; i += 1) {
    curr[0] = i
    for (let j = 1; j <= n; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1
      curr[j] = Math.min(
        prev[j]! + 1, // deleção
        curr[j - 1]! + 1, // inserção
        prev[j - 1]! + cost, // substituição
      )
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]!
}
