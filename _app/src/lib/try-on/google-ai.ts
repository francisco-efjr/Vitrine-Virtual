import 'server-only'
import sharp from 'sharp'
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

// Fallback models tried in order when the primary fails with 503/429/404.
// Only models that support responseModalities: IMAGE are valid here.
// Atualizado 2026-05: gemini-2.0-flash-preview-image-generation foi descontinuado
// (404 em v1beta). Usamos a família 2.5-flash-image (Nano Banana GA) como rede
// de segurança, e o preview 2.5 como degrau intermediário caso a GA também esteja
// sob carga.
const MODEL_FALLBACK_CHAIN = [
  'gemini-2.5-flash-image',
  'gemini-2.5-flash-image-preview',
]

const MAX_ATTEMPTS = 3
const RETRY_BACKOFF_MS: readonly number[] = [2_000, 4_000]
// Matches Next.js route maxDuration — leaves headroom for Supabase upload.
const FETCH_TIMEOUT_MS = 120_000

// Spec: max 1200px on long side, JPEG q85 for model input.
const MAX_IMAGE_LONG_SIDE = 1200
const IMAGE_QUALITY = 85

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function resizeForApi(base64: string): Promise<{ base64: string; mimeType: string }> {
  const buf = Buffer.from(base64, 'base64')
  const resized = await sharp(buf)
    .resize(MAX_IMAGE_LONG_SIDE, MAX_IMAGE_LONG_SIDE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: IMAGE_QUALITY })
    .toBuffer()
  return { base64: resized.toString('base64'), mimeType: 'image/jpeg' }
}

async function convertToJpeg(base64: string): Promise<string> {
  const buf = Buffer.from(base64, 'base64')
  const jpeg = await sharp(buf).jpeg({ quality: 92 }).toBuffer()
  return jpeg.toString('base64')
}

export const googleAiProvider: TryOnProvider = {
  name: 'google',

  async generate(input: TryOnProviderInput): Promise<TryOnProviderResult> {
    const env = getServerEnv()
    if (!env.GOOGLE_AI_API_KEY) {
      throw new TryOnProviderError(
        'GOOGLE_AI_API_KEY não configurada para o Nano Banana',
        'google',
        false,
      )
    }

    const t0 = Date.now()
    const primaryModel = env.GOOGLE_AI_MODEL ?? 'gemini-2.0-flash-preview-image-generation'
    const modelsToTry = [primaryModel, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== primaryModel)]

    const rawCustomerBase64 = extractBase64FromDataUrl(input.references.customerReferenceImage)

    const [customer, garmentInlineData] = await Promise.all([
      resizeForApi(rawCustomerBase64),
      fetchImageAsInlineData(input.product.productImage),
    ])

    logger.info('Nano Banana try-on: imagens preparadas', {
      customerMime: customer.mimeType,
      garmentMime: garmentInlineData.mimeType,
    })

    const requestBody = JSON.stringify({
      generationConfig: {
        temperature: 0.4,
        responseModalities: ['IMAGE', 'TEXT'],
        imageConfig: {
          imageSize: env.GOOGLE_AI_IMAGE_SIZE,
          aspectRatio: env.GOOGLE_AI_ASPECT_RATIO,
        },
      },
      contents: [
        {
          role: 'user',
          parts: [
            { text: VIRTUAL_TRYON_PROMPT },
            {
              text: 'CUSTOMER_PHOTO: the sole reference for the person. Preserve their body, pose, proportions, face, and identity exactly as shown.',
            },
            { inlineData: { mimeType: customer.mimeType, data: customer.base64 } },
            {
              text: 'GARMENT_IMAGE: exact product reference. Preserve garment design, color, texture, scale, and styling.',
            },
            { inlineData: garmentInlineData },
          ],
        },
      ],
    })

    let lastError: TryOnProviderError | undefined

    for (const model of modelsToTry) {
      const requestUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
      logger.info('Nano Banana try-on: enviando request', { model })

      let response: Response | undefined

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (attempt > 0) {
          const delayMs = RETRY_BACKOFF_MS[attempt - 1] ?? 2_000
          logger.info('Nano Banana: aguardando retry', { model, attempt, delayMs })
          await sleep(delayMs)
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

        try {
          response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': env.GOOGLE_AI_API_KEY,
            },
            body: requestBody,
            signal: controller.signal,
          })
        } finally {
          clearTimeout(timeoutId)
        }

        if (response.ok) break

        const isCapacityError = response.status === 503 || response.status === 429
        if (!isCapacityError || attempt === MAX_ATTEMPTS - 1) break
      }

      if (!response) continue

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        logger.warn('Nano Banana request falhou', {
          model,
          status: response.status,
          body: body.slice(0, 300),
        })
        // 404 = nome de modelo inválido/descontinuado. NÃO é fatal para a cadeia:
        // o próximo modelo no fallback pode estar válido. Marca como retriable
        // para o orchestrator e segue tentando.
        // 429/5xx = capacity → retriable, segue para o próximo modelo.
        // 4xx restantes (auth, bad request) = problema do request → fatal.
        const isCapacityError = response.status >= 500 || response.status === 429
        const isModelNotFound = response.status === 404
        const retriable = isCapacityError || isModelNotFound
        lastError = new TryOnProviderError(
          `Nano Banana ${response.status}`,
          'google',
          retriable,
        )
        if (!retriable) throw lastError
        continue
      }

      const payload = (await response.json()) as GeminiResponse
      const candidate = payload.candidates?.[0]
      const parts = candidate?.content?.parts ?? []
      const imagePart = parts.find((part) => part.inlineData?.mimeType?.startsWith('image/'))

      if (!imagePart?.inlineData?.data) {
        logger.warn('Nano Banana: resposta sem imagem gerada', {
          model,
          parts: parts.map((part) => Object.keys(part).join(',')),
        })
        lastError = new TryOnProviderError('Nano Banana não gerou imagem', 'google', true)
        continue
      }

      const rawResultBase64 = imagePart.inlineData.data
      const rawResultMime = imagePart.inlineData.mimeType ?? 'image/png'

      // Normalize output to JPEG.
      const resultBase64 =
        rawResultMime === 'image/jpeg' ? rawResultBase64 : await convertToJpeg(rawResultBase64)
      const resultMime = 'image/jpeg'

      const requestId = crypto.randomUUID()
      const storagePath = `${requestId}.jpg`
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
        model,
        durationMs: Date.now() - t0,
      })

      return {
        resultUrl: signed.signedUrl,
        requestId,
        durationMs: Date.now() - t0,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }
    }

    throw (
      lastError ?? new TryOnProviderError('Todos os modelos Google falharam', 'google', true)
    )
  },
}

function extractBase64FromDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(',')
  if (comma === -1) return dataUrl
  return dataUrl.slice(comma + 1)
}

async function fetchImageAsInlineData(url: string): Promise<Required<GeminiInlineData>> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new TryOnProviderError(
      `Falha ao baixar imagem da peça: ${res.status}`,
      'google',
      res.status >= 500,
    )
  }

  const buf = Buffer.from(await res.arrayBuffer())
  // Resize garment image too to keep payload small.
  const { base64, mimeType } = await resizeForApi(buf.toString('base64'))

  return { mimeType, data: base64 }
}
