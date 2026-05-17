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
import { buildVirtualTryOnPrompt } from './prompts/virtual-try-on-prompt'
import { inspectImageBuffer, normalizeTryOnResultComposition } from './image-composition'

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
const MODEL_FALLBACK_CHAIN = ['gemini-2.5-flash-image', 'gemini-2.5-flash-image-preview']

const MODELS_WITH_IMAGE_SIZE = new Set([
  'gemini-3.1-flash-image-preview',
  'gemini-3-pro-image-preview',
])

function isUnsupportedTryOnModel(model: string): boolean {
  return model.startsWith('imagen-')
}

const MAX_ATTEMPTS = 3
const RETRY_BACKOFF_MS: readonly number[] = [2_000, 4_000]
// Matches Next.js route maxDuration — leaves headroom for Supabase upload.
const FETCH_TIMEOUT_MS = 120_000

// Keep high-resolution customer references for Google while bounding payload size.
const MAX_IMAGE_LONG_SIDE = 3840
const IMAGE_QUALITY = 85

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function resizeForApi(base64: string): Promise<{
  base64: string
  mimeType: string
  original: Awaited<ReturnType<typeof inspectImageBuffer>>
  sent: Awaited<ReturnType<typeof inspectImageBuffer>>
}> {
  const buf = Buffer.from(base64, 'base64')
  const original = await inspectImageBuffer(buf)
  const resized = await sharp(buf)
    .resize(MAX_IMAGE_LONG_SIDE, MAX_IMAGE_LONG_SIDE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: IMAGE_QUALITY })
    .toBuffer()
  const sent = await inspectImageBuffer(resized)
  return { base64: resized.toString('base64'), mimeType: 'image/jpeg', original, sent }
}

async function convertToJpeg(base64: string): Promise<Buffer> {
  const buf = Buffer.from(base64, 'base64')
  return sharp(buf).jpeg({ quality: 92 }).toBuffer()
}

function buildGenerationConfig(model: string, env: ReturnType<typeof getServerEnv>) {
  const image: Record<string, string> = {
    aspectRatio: env.GOOGLE_AI_ASPECT_RATIO,
  }

  if (MODELS_WITH_IMAGE_SIZE.has(model)) {
    image.imageSize = env.GOOGLE_AI_IMAGE_SIZE
  }

  return {
    temperature: 0.4,
    responseModalities: ['IMAGE', 'TEXT'],
    imageConfig: image,
  }
}

function inspectSupabaseDeliveryUrl(signedUrl: string) {
  try {
    const url = new URL(signedUrl)
    const transformParams = ['width', 'height', 'resize', 'quality', 'format'].filter((param) =>
      url.searchParams.has(param),
    )
    const usesRenderEndpoint = url.pathname.includes('/storage/v1/render/image/')

    return {
      host: url.host,
      pathnameKind: usesRenderEndpoint ? 'render/image' : 'object/sign',
      usesStorageTransformation: usesRenderEndpoint || transformParams.length > 0,
      transformParams,
    }
  } catch {
    return {
      host: 'invalid-url',
      pathnameKind: 'unknown',
      usesStorageTransformation: false,
      transformParams: [],
    }
  }
}

function summarizeGoogleErrorBody(body: string): string {
  if (!body) return ''
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string; status?: string } }
    const status = parsed.error?.status
    const message = parsed.error?.message
    return [status, message].filter(Boolean).join(': ').slice(0, 300)
  } catch {
    return body.slice(0, 300)
  }
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
    // Modelo escolhido por loja (Super-Admin → High/Medium). Sem override,
    // cai no GOOGLE_AI_MODEL. A cadeia de fallback continua para resiliência.
    const primaryModel =
      input.generation?.googleModelOverride || env.GOOGLE_AI_MODEL || 'gemini-2.5-flash-image'
    const candidateModels = [
      primaryModel,
      ...MODEL_FALLBACK_CHAIN.filter((m) => m !== primaryModel),
    ]
    const modelsToTry = candidateModels.filter((model) => {
      if (!isUnsupportedTryOnModel(model)) return true
      logger.warn('Google image API model skipped for try-on', {
        model,
        reason:
          'Imagen models use a different text-to-image API and are not compatible with this two-image Gemini try-on request.',
      })
      return false
    })

    const rawCustomerBase64 = extractBase64FromDataUrl(input.references.customerReferenceImage)

    const customBackgroundUrl =
      input.background.mode === 'custom' ? input.background.backgroundImage : undefined

    const [customer, garmentInlineData, backgroundInlineData] = await Promise.all([
      resizeForApi(rawCustomerBase64),
      fetchImageAsInlineData(input.product.productImage),
      customBackgroundUrl ? fetchImageAsInlineData(customBackgroundUrl) : Promise.resolve(null),
    ])
    const effectiveBackgroundMode = backgroundInlineData ? 'custom' : 'white'

    logger.info('Google image API inputs prepared', {
      inputs: [
        {
          name: 'CUSTOMER_PHOTO',
          mimeType: customer.mimeType,
          original: customer.original,
          sent: customer.sent,
        },
        {
          name: 'GARMENT_IMAGE',
          mimeType: garmentInlineData.mimeType,
          original: garmentInlineData.original,
          sent: garmentInlineData.sent,
        },
      ],
      background: backgroundInlineData
        ? {
            mode: 'custom',
            mimeType: backgroundInlineData.mimeType,
            original: backgroundInlineData.original,
            sent: backgroundInlineData.sent,
          }
        : {
            mode: 'white',
          },
    })

    const prompt = buildVirtualTryOnPrompt(effectiveBackgroundMode)
    const backgroundParts = backgroundInlineData
      ? [
          {
            text: 'BACKGROUND_IMAGE: exact store background reference. Use this as the final image background instead of the white studio default.',
          },
          {
            inlineData: {
              mimeType: backgroundInlineData.mimeType,
              data: backgroundInlineData.data,
            },
          },
        ]
      : []

    const contents = [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            text: 'CUSTOMER_PHOTO: the sole reference for the person. Preserve their body, pose, proportions, face, and identity exactly as shown.',
          },
          { inlineData: { mimeType: customer.mimeType, data: customer.base64 } },
          {
            text: 'GARMENT_IMAGE: exact product reference. Preserve garment design, color, texture, scale, and styling.',
          },
          { inlineData: { mimeType: garmentInlineData.mimeType, data: garmentInlineData.data } },
          ...backgroundParts,
        ],
      },
    ]

    let lastError: TryOnProviderError | undefined

    for (const model of modelsToTry) {
      const requestUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
      const generationConfig = buildGenerationConfig(model, env)
      const requestBody = JSON.stringify({
        generationConfig,
        contents,
      })

      const responseImageConfig = generationConfig.imageConfig
      logger.info('Google image API request config', {
        model,
        responseModalities: generationConfig.responseModalities,
        responseAspectRatio: responseImageConfig.aspectRatio,
        responseImageSize: responseImageConfig.imageSize ?? null,
      })

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
        const errorSummary = summarizeGoogleErrorBody(body)
        lastError = new TryOnProviderError(
          `Nano Banana ${response.status}${errorSummary ? `: ${errorSummary}` : ''}`,
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
      const rawResultBuffer = Buffer.from(rawResultBase64, 'base64')
      const rawResultDimensions = await inspectImageBuffer(rawResultBuffer)

      // Normalize output to JPEG.
      const resultBuffer =
        rawResultMime === 'image/jpeg' ? rawResultBuffer : await convertToJpeg(rawResultBase64)
      const resultMime = 'image/jpeg'
      const composition =
        effectiveBackgroundMode === 'white'
          ? await normalizeTryOnResultComposition(resultBuffer)
          : {
              buffer: resultBuffer,
              cropped: false,
              foregroundBounds: undefined,
              cropBounds: undefined,
            }
      const uploadCandidateDimensions = await inspectImageBuffer(composition.buffer)

      logger.info('Google image API response dimensions before storage upload', {
        model,
        rawResult: {
          mimeType: rawResultMime,
          dimensions: rawResultDimensions,
        },
        uploadCandidate: {
          mimeType: resultMime,
          dimensions: uploadCandidateDimensions,
        },
        composition: {
          cropped: composition.cropped,
          foregroundBounds: composition.foregroundBounds ?? null,
          cropBounds: composition.cropBounds ?? null,
        },
      })

      const requestId = crypto.randomUUID()
      const storagePath = `${requestId}.jpg`
      const supabase = createServiceClient()
      const resultBucket = supabase.storage.from('try-on-results')

      const { error: uploadError } = await resultBucket.upload(storagePath, composition.buffer, {
        contentType: resultMime,
        upsert: false,
      })

      if (uploadError) {
        logger.error('Nano Banana: falha ao salvar resultado no storage', {
          code: uploadError.message,
        })
        throw new TryOnProviderError('Falha ao armazenar resultado', 'google', true)
      }

      const { data: downloaded, error: downloadError } = await resultBucket.download(storagePath)
      if (downloadError || !downloaded) {
        logger.warn('Google try-on: could not download stored result for dimension check', {
          storagePath,
          code: downloadError?.message,
        })
      } else {
        const downloadedBuffer = Buffer.from(await downloaded.arrayBuffer())
        const downloadedDimensions = await inspectImageBuffer(downloadedBuffer)
        logger.info('Supabase stored result dimensions after direct download', {
          storagePath,
          dimensions: downloadedDimensions,
          transformationApplied: false,
        })
      }

      const { data: signed, error: signError } = await resultBucket.createSignedUrl(
        storagePath,
        24 * 60 * 60,
      )

      if (signed?.signedUrl) {
        logger.info('Supabase signed result URL transformation check', {
          storagePath,
          ...inspectSupabaseDeliveryUrl(signed.signedUrl),
        })
      }

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
        modelUsed: model,
        finalPrompt: prompt,
        generationParams: {
          model,
          temperature: generationConfig.temperature,
          responseModalities: generationConfig.responseModalities,
          aspectRatio: responseImageConfig.aspectRatio,
          imageSize: responseImageConfig.imageSize ?? null,
          backgroundMode: effectiveBackgroundMode,
        },
        resultBucket: 'try-on-results',
        resultPath: storagePath,
      }
    }

    throw lastError ?? new TryOnProviderError('Todos os modelos Google falharam', 'google', true)
  },
}

function extractBase64FromDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(',')
  if (comma === -1) return dataUrl
  return dataUrl.slice(comma + 1)
}

async function fetchImageAsInlineData(url: string): Promise<
  Required<GeminiInlineData> & {
    original: Awaited<ReturnType<typeof inspectImageBuffer>>
    sent: Awaited<ReturnType<typeof inspectImageBuffer>>
  }
> {
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
  const { base64, mimeType, original, sent } = await resizeForApi(buf.toString('base64'))

  return { mimeType, data: base64, original, sent }
}
