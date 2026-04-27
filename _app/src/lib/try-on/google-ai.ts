import 'server-only'
import { GoogleGenerativeAI } from '@google/generative-ai'
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
 * Prompt de try-on virtual para o Gemini.
 *
 * Filosofia: dar uma NOÇÃO DE ESTILO, não uma sobreposição pixel-perfect.
 * O modelo precisa:
 *   1. Reconhecer a estrutura e proporções corporais da pessoa
 *   2. Integrar a peça de roupa de forma natural (dobras, sombras, caimento)
 *   3. Respeitar o tamanho aparente da peça (não exagerar nem miniaturizar)
 *   4. Manter a identidade visual da pessoa (rosto, tom de pele, cabelo)
 */
const TRY_ON_PROMPT = `You are a professional fashion AI specialized in virtual try-on visualization.

You will receive TWO images:
- Image 1: The customer's photo
- Image 2: A clothing piece from a store

TASK: Generate a single realistic photo showing the customer in Image 1 wearing the clothing from Image 2.

STRICT REQUIREMENTS:
1. PERSON IDENTITY — Preserve the customer's face, hairstyle, skin tone, and body proportions exactly as they appear. Do not alter their appearance.
2. CLOTHING INTEGRATION — The garment must appear naturally draped on the person's body with realistic fabric folds, wrinkles, and shadows appropriate for the fabric type.
3. SIZE & PROPORTIONS — The clothing must look properly sized for this person. Avoid making it appear too oversized or too tight unless that is clearly the garment's intended style. Give an accurate sense of how the garment would actually fit and fall on this body.
4. BODY STRUCTURE — Carefully analyze the customer's posture, body shape, and pose. The clothing should conform naturally to their body structure.
5. LIGHTING — Match the lighting direction and color temperature of the original customer photo.
6. BACKGROUND — Keep a background consistent with or similar to the customer's original photo.
7. STYLE GOAL — This is a fashion preview. Prioritize a natural, wearable look that helps the customer visualize wearing this piece. Photorealism is more important than perfect accuracy.

Output a high-quality, well-lit fashion photograph. Do not include any text, watermarks, or annotations in the image.`

/**
 * Provider Google AI — usa Gemini 2.0 Flash com geração de imagem.
 *
 * FLUXO:
 *   1. Recebe foto do cliente (base64) + URL da peça (URL assinada do Supabase)
 *   2. Baixa a imagem da peça para base64 (Gemini precisa de inline data)
 *   3. Envia ambas as imagens + prompt ao Gemini
 *   4. Recebe imagem gerada (PNG base64 inline)
 *   5. Faz upload do resultado para o bucket 'try-on-results' (service role)
 *   6. Retorna signed URL com TTL de 24h
 *
 * PRIVACIDADE (ADR 0006):
 *   - A foto do cliente NUNCA é armazenada — existe apenas em memória durante o request
 *   - O resultado é armazenado temporariamente (24h) no bucket try-on-results
 *   - Não há retenção da foto pelo Google se usarmos a chave API do AI Studio
 *     (diferente de produtos Google com login de usuário)
 */
export const googleAiProvider: TryOnProvider = {
  name: 'google',

  async generate(input: TryOnProviderInput): Promise<TryOnProviderResult> {
    const env = getServerEnv()
    if (!env.GOOGLE_AI_API_KEY) {
      throw new TryOnProviderError('GOOGLE_AI_API_KEY não configurada', 'google', false)
    }

    const t0 = Date.now()
    const model = env.GOOGLE_AI_MODEL ?? 'gemini-2.0-flash-exp'

    // --- 1. Extrair base64 da foto do cliente ---
    const personBase64 = extractBase64FromDataUrl(input.modelImage)
    const personMime = extractMimeFromDataUrl(input.modelImage)

    // --- 2. Baixar imagem da peça (URL assinada) e converter para base64 ---
    const garmentBase64 = await fetchImageAsBase64(input.garmentImage)

    // --- 3. Chamar Gemini com geração de imagem habilitada ---
    const genAI = new GoogleGenerativeAI(env.GOOGLE_AI_API_KEY)
    const generativeModel = genAI.getGenerativeModel({
      model,
      // @ts-expect-error — responseModalities é experimental e ainda não está nos tipos oficiais
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    })

    const response = await generativeModel.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: TRY_ON_PROMPT },
            {
              inlineData: {
                mimeType: personMime as 'image/jpeg' | 'image/png' | 'image/webp',
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
    })

    // --- 4. Extrair imagem gerada da resposta ---
    const candidate = response.response.candidates?.[0]
    if (!candidate) {
      logger.warn('Google AI: sem candidate na resposta')
      throw new TryOnProviderError('Google AI não retornou resultado', 'google', true)
    }

    // Encontra a parte que é imagem (pode vir com partes de texto também)
    const imagePart = candidate.content.parts.find(
      (p) => 'inlineData' in p && p.inlineData?.mimeType?.startsWith('image/'),
    )

    if (!imagePart || !('inlineData' in imagePart) || !imagePart.inlineData?.data) {
      logger.warn('Google AI: resposta sem imagem gerada', {
        parts: candidate.content.parts.map((p) => Object.keys(p).join(',')),
      })
      throw new TryOnProviderError('Google AI não gerou imagem', 'google', true)
    }

    const resultBase64 = imagePart.inlineData.data
    const resultMime = imagePart.inlineData.mimeType ?? 'image/png'
    const ext = resultMime === 'image/jpeg' ? 'jpg' : resultMime === 'image/webp' ? 'webp' : 'png'

    // --- 5. Upload do resultado para Supabase (service role) ---
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

    // --- 6. Gerar signed URL (24h) ---
    const { data: signed, error: signError } = await supabase.storage
      .from('try-on-results')
      .createSignedUrl(storagePath, 24 * 60 * 60)

    if (signError || !signed?.signedUrl) {
      logger.error('Google AI: falha ao gerar signed URL', { code: signError?.message })
      throw new TryOnProviderError('Falha ao gerar URL do resultado', 'google', true)
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const durationMs = Date.now() - t0

    logger.info('Google AI try-on concluído', { model, durationMs, storagePath })

    return {
      resultUrl: signed.signedUrl,
      requestId,
      durationMs,
      expiresAt,
    }
  },
}

// =============================================================================
// Helpers
// =============================================================================

/** Extrai o base64 puro de um data URL (data:image/jpeg;base64,XXXXX). */
function extractBase64FromDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(',')
  if (comma === -1) return dataUrl // já é base64 puro
  return dataUrl.slice(comma + 1)
}

/** Extrai o MIME type de um data URL. Padrão: image/jpeg. */
function extractMimeFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);/)
  return match?.[1] ?? 'image/jpeg'
}

/**
 * Baixa uma imagem de uma URL e retorna base64 puro.
 * Usado para converter a URL assinada da peça em inline data para o Gemini.
 */
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
