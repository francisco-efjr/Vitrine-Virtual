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
import { VIRTUAL_TRYON_PROMPT } from './prompts/virtual-try-on-prompt'

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
      throw new TryOnProviderError('GOOGLE_AI_API_KEY não configurada para o Nano Banana', 'google', false)
    }

    const t0 = Date.now()
    const model = env.GOOGLE_AI_MODEL ?? 'gemini-2.5-flash-image'
    const personBase64 = extractBase64FromDataUrl(input.modelImage)
    const personMime = extractMimeFromDataUrl(input.modelImage)
    const garmentBase64 = await fetchImageAsBase64(input.garmentImage)
    const requestUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

    logger.info('Nano Banana try-on: enviando request', { model, personMime })

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.GOOGLE_AI_API_KEY,
      },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.4,
          responseModalities: ['IMAGE', 'TEXT'],
        },
        contents: [
          {
            role: 'user',
            parts: [
              { text: VIRTUAL_TRYON_PROMPT },
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
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      logger.warn('Nano Banana request falhou', {
        status: response.status,
        body: body.slice(0, 200),
      })
      throw new TryOnProviderError(
        `Nano Banana ${response.status}`,
        'google',
        response.status >= 500 || response.status === 429,
      )
    }

    const payload = (await response.json()) as GeminiResponse
    const candidate = payload.candidates?.[0]
    const parts = candidate?.content?.parts ?? []
    const imagePart = parts.find((part) => part.inlineData?.mimeType?.startsWith('image/'))

    if (!imagePart?.inlineData?.data) {
      logger.warn('Nano Banana: resposta sem imagem gerada', {
        parts: parts.map((part) => Object.keys(part).join(',')),
      })
      throw new TryOnProviderError('Nano Banana não gerou imagem', 'google', true)
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
      logger.error('Nano Banana: falha ao salvar resultado no storage', {
        code: uploadError.message,
      })
      throw new TryOnProviderError('Falha ao armazenar resultado', 'google', true)
    }

    const { data: signed, error: signError } = await supabase.storage
      .from('try-on-results')
      .createSignedUrl(storagePath, 24 * 60 * 60)

    if (signError || !signed?.signedUrl) {
      logger.error('Nano Banana: falha ao gerar signed URL', { code: signError?.message })
      throw new TryOnProviderError('Falha ao gerar URL do resultado', 'google', true)
    }

    logger.info('Nano Banana try-on: geração concluída', {
      requestId,
      durationMs: Date.now() - t0,
      model,
    })

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
