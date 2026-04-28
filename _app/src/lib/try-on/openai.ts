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

const TRY_ON_PROMPT = `You are a professional fashion AI specialized in virtual try-on visualization.

You will receive TWO reference images:
- Image 1: The customer's photo (the person)
- Image 2: A clothing piece from a fashion store (the garment)

TASK: Generate a single, realistic fashion photograph showing the customer from Image 1 wearing the clothing from Image 2.

STRICT REQUIREMENTS:
1. PERSON IDENTITY — Preserve the customer's face, hairstyle, skin tone, and body proportions exactly.
2. CLOTHING INTEGRATION — Make the garment appear naturally draped on the body with realistic folds, shadows, and texture.
3. SIZE & PROPORTIONS — Keep the clothing properly sized for this specific person's body.
4. BODY STRUCTURE — Respect the original posture, pose, and body shape.
5. LIGHTING — Match the lighting direction and color temperature of the original customer photo.
6. BACKGROUND — Keep a background consistent with the original customer photo.
7. STYLE GOAL — This is a fashion preview; natural wearability matters more than pixel-perfect accuracy.

Output a single high-quality fashion photograph. No text, watermarks, or annotations.`

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
    const garmentBuffer = await fetchImageBuffer(input.garmentImage)

    // -------------------------------------------------------------------------
    // 2. Montar FormData com as duas imagens
    //    gpt-image-1 exige array syntax: 'image[]' para múltiplas imagens
    // -------------------------------------------------------------------------
    const formData = new FormData()
    formData.append('model', model)
    formData.append('prompt', TRY_ON_PROMPT)
    formData.append('n', '1')
    // 'auto' deixa o modelo escolher o tamanho ideal — mais compatível
    formData.append('size', 'auto')
    formData.append('quality', 'medium')

    // Foto do cliente (base64 data URL → Buffer → Blob)
    // OpenAI exige array syntax: 'image[]' quando múltiplas imagens são enviadas
    const personBuffer = Buffer.from(extractBase64FromDataUrl(input.modelImage), 'base64')
    const personMime = extractMimeFromDataUrl(input.modelImage)
    const personExt = mimeToExt(personMime)
    const personBlob = new Blob([personBuffer], { type: personMime })
    formData.append('image[]', personBlob, `person.${personExt}`)

    // Foto da peça (baixada acima)
    const garmentBlob = new Blob([garmentBuffer], { type: 'image/jpeg' })
    formData.append('image[]', garmentBlob, 'garment.jpg')

    // -------------------------------------------------------------------------
    // 3. Chamar a API de edição de imagem
    // -------------------------------------------------------------------------
    logger.info('OpenAI try-on: enviando request', { model, personMime })

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
      const nonRetriable = response.status === 401 || response.status === 403 || response.status === 404
      throw new TryOnProviderError(
        `OpenAI ${errorMsg}`,
        'openai',
        !nonRetriable,
      )
    }

    // -------------------------------------------------------------------------
    // 4. Extrair a imagem gerada da resposta
    // -------------------------------------------------------------------------
    const payload = (await response.json()) as OpenAIImageResponse
    const item = payload.data?.[0]

    if (!item) {
      logger.warn('OpenAI try-on: resposta sem data[]', { payload: JSON.stringify(payload).slice(0, 200) })
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
      throw new TryOnProviderError('Falha ao armazenar resultado', 'openai', true)
    }

    // -------------------------------------------------------------------------
    // 6. Gerar signed URL com 24 h de validade
    // -----