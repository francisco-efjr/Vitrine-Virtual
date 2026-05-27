import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import { getServerEnv } from '@/lib/env'
import { logger } from '@/lib/logger'
import {
  buildVirtualTryOnPrompt,
  type VirtualTryOnBackgroundMode,
} from './prompts/virtual-try-on-prompt'
import {
  TryOnProviderError,
  type TryOnProvider,
  type TryOnProviderInput,
  type TryOnProviderResult,
} from './types'

/**
 * Provider de try-on usando OpenAI gpt-image-1.
 *
 * O gpt-image-1 suporta múltiplas imagens como input via multipart form-data,
 * o que o torna adequado para virtual try-on: foto do cliente + foto da peça.
 *
 * Endpoint: POST https://api.openai.com/v1/images/edits
 * Docs: https://platform.openai.com/docs/api-reference/images/createEdit
 *
 * Custo estimado:
 *   - 1024×1024 / quality=low    ≈ US$ 0,02–0,03 por geração
 *   - 1024×1024 / quality=medium ≈ US$ 0,06–0,08 por geração
 */

interface OpenAIErrorBody {
  error?: {
    message?: string
    type?: string
    code?: string
  }
}

interface OpenAIImageResponse {
  data: Array<{
    b64_json?: string
    url?: string
    revised_prompt?: string
  }>
}

export const openAiProvider: TryOnProvider = {
  name: 'openai',

  async generate(input: TryOnProviderInput): Promise<TryOnProviderResult> {
    const env = getServerEnv()
    if (!env.OPENAI_API_KEY) {
      throw new TryOnProviderError('OPENAI_API_KEY não configurada', 'openai', false)
    }

    const t0 = Date.now()
    const model = env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1'

    // -------------------------------------------------------------------------
    // 1. Baixar a foto da peça antes de montar o FormData
    //    (falha rápido se a URL já estiver expirada)
    // -------------------------------------------------------------------------
    const customBackgroundUrl =
      input.background.mode === 'custom' ? input.background.backgroundImage : undefined
    const [garmentImage, backgroundImage] = await Promise.all([
      fetchImageAsset(input.product.productImage),
      customBackgroundUrl ? fetchImageAsset(customBackgroundUrl) : Promise.resolve(null),
    ])
    const effectiveBackgroundMode: VirtualTryOnBackgroundMode = backgroundImage
      ? 'custom'
      : input.background.mode === 'customer'
        ? 'preserve_customer'
        : 'white'
    const promptOverride = input.generation?.promptOverride?.trim()
    const prompt = promptOverride || buildVirtualTryOnPrompt(effectiveBackgroundMode)

    // -------------------------------------------------------------------------
    // 2. Montar FormData com as duas imagens
    //    gpt-image-1 exige array syntax: 'image[]' para múltiplas imagens
    // -------------------------------------------------------------------------
    const formData = new FormData()
    formData.append('model', model)
    formData.append('prompt', prompt)
    formData.append('n', '1')
    // 'auto' deixa o modelo escolher o tamanho ideal — mais compatível
    formData.append('size', 'auto')
    formData.append('quality', 'medium')

    // GARMENT_IMAGE first: exact product reference.
    const garmentBlob = new Blob([new Uint8Array(garmentImage.buffer)], {
      type: garmentImage.mimeType,
    })
    formData.append('image[]', garmentBlob, `garment-image.${garmentImage.ext}`)

    if (backgroundImage) {
      const backgroundBlob = new Blob([new Uint8Array(backgroundImage.buffer)], {
        type: backgroundImage.mimeType,
      })
      formData.append('image[]', backgroundBlob, `background-image.${backgroundImage.ext}`)
    }

    // CUSTOMER_PHOTO last: sole reference for the person's body, pose, and face.
    const customerBuffer = Buffer.from(
      extractBase64FromDataUrl(input.references.customerReferenceImage),
      'base64',
    )
    const customerMime = extractMimeFromDataUrl(input.references.customerReferenceImage)
    const customerExt = mimeToExt(customerMime)
    const customerBlob = new Blob([new Uint8Array(customerBuffer)], { type: customerMime })
    formData.append('image[]', customerBlob, `customer-photo.${customerExt}`)

    // -------------------------------------------------------------------------
    // 3. Chamar a API de edição de imagem
    // -------------------------------------------------------------------------
    logger.info('OpenAI try-on: enviando request', {
      model,
      customerMime,
      backgroundMode: effectiveBackgroundMode,
    })

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        // NÃO definir Content-Type — fetch define automaticamente com o boundary
      },
      body: formData,
    })

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`
      try {
        const errBody = (await response.json()) as OpenAIErrorBody
        const detail = errBody?.error?.message ?? errBody?.error?.code ?? ''
        if (detail) errorMsg = `${response.status}: ${detail}`
      } catch {
        const text = await response.text().catch(() => '')
        if (text) errorMsg = `${response.status}: ${text.slice(0, 200)}`
      }

      logger.warn('OpenAI try-on: API retornou erro', { status: response.status, errorMsg })

      // 401/403 = key inválida ou sem acesso ao modelo → não tentar outro provider
      const nonRetriable =
        response.status === 401 || response.status === 403 || response.status === 404
      throw new TryOnProviderError(`OpenAI ${errorMsg}`, 'openai', !nonRetriable)
    }

    // -------------------------------------------------------------------------
    // 4. Extrair a imagem gerada da resposta
    // -------------------------------------------------------------------------
    const payload = (await response.json()) as OpenAIImageResponse
    const item = payload.data?.[0]

    if (!item) {
      logger.warn('OpenAI try-on: resposta sem data[]', {
        payload: JSON.stringify(payload).slice(0, 200),
      })
      throw new TryOnProviderError('OpenAI retornou resposta vazia', 'openai', true)
    }

    // gpt-image-1 retorna b64_json por padrão; dall-e-3 pode retornar url
    let resultBuffer: Buffer
    if (item.b64_json) {
      resultBuffer = Buffer.from(item.b64_json, 'base64')
    } else if (item.url) {
      // Fallback: baixa a URL temporária
      logger.info('OpenAI try-on: usando URL em vez de b64_json')
      resultBuffer = await fetchImageBuffer(item.url)
    } else {
      logger.warn('OpenAI try-on: resposta sem imagem', { keys: Object.keys(item).join(',') })
      throw new TryOnProviderError('OpenAI não retornou imagem na resposta', 'openai', true)
    }

    // -------------------------------------------------------------------------
    // 5. Salvar resultado no Supabase Storage (bucket try-on-results)
    // -------------------------------------------------------------------------
    const requestId = crypto.randomUUID()
    const storagePath = `${requestId}.png`
    const supabase = createServiceClient()

    const { error: uploadError } = await supabase.storage
      .from('try-on-results')
      .upload(storagePath, resultBuffer, {
        contentType: 'image/png',
        upsert: false,
      })

    if (uploadError) {
      logger.error('OpenAI try-on: falha ao salvar no storage', { code: uploadError.message })
      // Inclui o erro do Supabase na mensagem para facilitar diagnóstico
      throw new TryOnProviderError(
        `Falha ao armazenar resultado (storage): ${uploadError.message}`,
        'openai',
        true,
      )
    }

    // -------------------------------------------------------------------------
    // 6. Gerar signed URL com 24 h de validade
    // -------------------------------------------------------------------------
    const TTL = 24 * 60 * 60

    const { data: signed, error: signError } = await supabase.storage
      .from('try-on-results')
      .createSignedUrl(storagePath, TTL)

    if (signError || !signed?.signedUrl) {
      logger.error('OpenAI try-on: falha ao gerar signed URL', { code: signError?.message })
      throw new TryOnProviderError('Falha ao gerar URL do resultado', 'openai', true)
    }

    const durationMs = Date.now() - t0
    logger.info('OpenAI try-on: geração concluída', { requestId, durationMs, model })

    return {
      resultUrl: signed.signedUrl,
      requestId,
      durationMs,
      expiresAt: new Date(Date.now() + TTL * 1000).toISOString(),
      finalPrompt: prompt,
      generationParams: {
        model,
        quality: 'medium',
        size: 'auto',
        backgroundMode: effectiveBackgroundMode,
        promptSource: promptOverride ? 'override' : 'default',
        promptVariantId: input.generation?.promptVariantId ?? null,
      },
    }
  },
}

// =============================================================================
// Helpers
// =============================================================================

function extractBase64FromDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(',')
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1)
}

function extractMimeFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);/)
  return match?.[1] ?? 'image/jpeg'
}

function mimeToExt(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  return 'jpg'
}

function normalizeImageMime(contentType: string | null): string {
  const mime = contentType?.split(';')[0]?.trim().toLowerCase()
  if (mime === 'image/png' || mime === 'image/webp' || mime === 'image/jpeg') return mime
  return 'image/jpeg'
}

async function fetchImageAsset(url: string): Promise<{
  buffer: Buffer
  mimeType: string
  ext: string
}> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new TryOnProviderError(
      `Falha ao baixar imagem (${res.status}): ${url.slice(0, 80)}`,
      'openai',
      res.status >= 500,
    )
  }

  const mimeType = normalizeImageMime(res.headers.get('Content-Type'))
  return {
    buffer: Buffer.from(await res.arrayBuffer()),
    mimeType,
    ext: mimeToExt(mimeType),
  }
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  return (await fetchImageAsset(url)).buffer
}
