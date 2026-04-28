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
 *   - 1024×1536 / quality=medium ≈ US$ 0,06–0,08 por geração
 *   - 1024×1024 / quality=low    ≈ US$ 0,02–0,03 por geração
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
    // 1. Montar FormData com as duas imagens
    // -------------------------------------------------------------------------
    const formData = new FormData()
    formData.append('model', model)
    formData.append('prompt', TRY_ON_PROMPT)
    formData.append('n', '1')
    formData.append('size', '1024x1536') // portrait — melhor para fashion
    formData.append('quality', 'medium')

    // Foto do cliente (base64 data URL)
    const personBuffer = Buffer.from(extractBase64FromDataUrl(input.modelImage), 'base64')
    const personMime = extractMimeFromDataUrl(input.modelImage)
    const personExt = mimeToExt(personMime)
    const personBlob = new Blob([personBuffer], { type: personMime })
    formData.append('image', personBlob, `person.${personExt}`)

    // Foto da peça (URL pública — precisa baixar)
    const garmentBuffer = await fetchImageBuffer(input.garmentImage)
    const garmentBlob = new Blob([garmentBuffer], { type: 'image/jpeg' })
    formData.append('image', garmentBlob, 'garment.jpg')

    // -------------------------------------------------------------------------
    // 2. Chamar a API de edição de imagem
    // -------------------------------------------------------------------------
    logger.info('OpenAI try-on: iniciando geração', { model })

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        // NÃO definir Content-Type — o fetch define automaticamente com o boundary correto
      },
      body: formData,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      logger.warn('OpenAI try-on: request falhou', {
        status: response.status,
        body: body.slice(0, 300),
      })
      throw new TryOnProviderError(
        `OpenAI ${response.status}: ${body.slice(0, 100)}`,
        'openai',
        response.status >= 500 || response.status === 429,
      )
    }

    const payload = (await response.json()) as OpenAIImageResponse
    const item = payload.data?.[0]

    if (!item?.b64_json) {
      logger.warn('OpenAI try-on: resposta sem imagem', { keys: Object.keys(item ?? {}) })
      throw new TryOnProviderError('OpenAI não retornou imagem gerada', 'openai', true)
    }

    // -------------------------------------------------------------------------
    // 3. Salvar resultado no Supabase Storage (bucket try-on-results)
    // -------------------------------------------------------------------------
    const requestId = crypto.randomUUID()
    const storagePath = `${requestId}.png`
    const resultBuffer = Buffer.from(item.b64_json, 'base64')
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
    // 4. Gerar signed URL com 24 h de validade
    // -------------------------------------------------------------------------
    const TTL = 24 * 60 * 60 // 24 horas em segundos

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

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new TryOnProviderError(
      `Falha ao baixar imagem da peça: ${res.status}`,
      'openai',
      res.status >= 500,
    )
  }
  return Buffer.from(await res.arrayBuffer())
}
