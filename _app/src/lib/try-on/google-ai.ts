import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import { getServerEnv } from '@/lib/env'
import { logger } from '@/lib/logger'
import {
  TryOnProviderError,
  type TryOnProvider,
  type TryOnProviderInput,
  type TryOnProviderResult,
} from './types'

const TRY_ON_PROMPT = `You are a professional fashion AI specialized in virtual try-on visualization.

You will receive TWO images:
- Image 1: The customer's photo
- Image 2: A clothing piece from a store

TASK: Generate a single realistic photo showing the customer in Image 1 wearing the clothing from Image 2.

STRICT REQUIREMENTS:
1. PERSON IDENTITY — Preserve the customer's face, hairstyle, skin tone, and body proportions exactly as they appear.
2. CLOTHING INTEGRATION — Make the garment appear naturally draped on the body with realistic folds and shadows.
3. SIZE & PROPORTIONS — Keep the clothing looking properly sized for this person.
4. BODY STRUCTURE — Respect posture, pose, and body shape from the original photo.
5. LIGHTING — Match the lighting direction and temperature of the original customer photo.
6. BACKGROUND — Keep a background consistent with the original customer photo.
7. STYLE GOAL — This is a fashion preview, so natural wearability is more important than pixel-perfect accuracy.

Output a high-quality fashion photograph. Do not include any text, watermark, or annotations.`

interface GeminiInlineData {
  mimeType?: string
  data?: string
}

interface GeminiPart {
  inlineData?: GeminiInlineData
  text?: string
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[]
    }
  }>
}

export const googleAiProvider: TryOnProvider = {
  name: 'google',

  async generate(input: TryOnProviderInput): Promise<TryOnProviderResult> {
    const env = getServerEnv()
    if (!env.GOOGLE_AI_API_KEY) {
      throw new TryOnProviderError('GOOGLE_AI_API_KEY não configurada', 'google', false)
    }

    const t0 = Date.now()
    const model = env.GOOGLE_AI_MODEL ?? 'gemini-2.0-flash-exp'
    const personBase64 = extractBase64FromDataUrl(input.modelImage)
    const personMime = extractMimeFromDataUrl(input.modelImage)
    const garmentBase64 = await fetchImageAsBase64(input.garmentImage)

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationConfig: {
            temperature: 0.4,
            responseModalities: ['IMAGE', 'TEXT'],
          },
          contents: [
            {
              role: 'user',
              parts: [
                { text: TRY_ON_PROMPT },
                {
                  inlineData: {
                    mimeType: personMime,
                    data: personBase64,
                  },
                },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: garmentBase64,
                  },
                },
              ],
            },
          ],
        }),
      },
    )

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      logger.warn('Google AI request falhou', { status: response.status, body: body.slice(0, 200) })
      throw new TryOnProviderError(
        `Google AI ${response.status}`,
        'google',
        response.status >= 500 || response.status === 429,
      )
    }

    const payload = (await response.json()) as GeminiResponse
    const candidate = payload.candidates?.[0]
    const parts = candidate?.content?.parts ?? []
    const imagePart = parts.find((part) => part.inlineData?.mimeType?.startsWith('image/'))

    if (!imagePart?.inlineData?.data) {
      logger.warn('Google AI: resposta sem imagem gerada', {
        parts: parts.map((part) => Object.keys(part).join(',')),
      })
      throw new TryOnProviderError('Google AI não gerou imagem', 'google', true)
    }

    const resultBase64 = imagePart.inlineData.data
    const resultMime = imagePart.inlineData.mimeType ?? 'image/png'
    const ext = resultMime === 'image/jpeg' ? 'jpg' : resultMime === 'image/webp' ? 'webp' : 'png'

    const requestId = crypto.randomUUID()
    const storagePath = `${requestId}.${ext}`
    const supabase = createServiceClient()
    const resultBuffer = Buffer.from(resultBase64, 'base64')

    const { error: uploadError } = await supabase.storage
      .from('try-on-results')
      .upload(storagePath, resultBuffer, {
        contentType: resultMime,
        upsert: false,
      })

    if (uploadError) {
      logger.error('Google AI: falha ao salvar resultado no storage', { code: uploadError.message })
      throw new TryOnProviderError('Falha ao armazenar resultado', 'google', true)
    }

    const { data: signed, error: signError } = await supabase.storage
      .from('try-on-results')
      .createSignedUrl(storagePath, 24 * 60 * 60)

    if (signError || !signed?.signedUrl) {
      logger.error('Google AI: falha ao gerar signed URL', { code: signError?.message })
      throw new TryOnProviderError('Falha ao gerar URL do resultado', 'google', true)
    }

    return {
      resultUrl: signed.signedUrl,
      requestId,
      durationMs: Date.now() - t0,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }
  },
}

function extractBase64FromDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(',')
  if (comma === -1) return dataUrl
  return dataUrl.slice(comma + 1)
}

function extractMimeFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);/)
  return match?.[1] ?? 'image/jpeg'
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new TryOnProviderError(
      `Falha ao baixar imagem da peça: ${res.status}`,
      'google',
      res.status >= 500,
    )
  }

  const buf = Buffer.from(await res.arrayBuffer())
  return buf.toString('base64')
}
