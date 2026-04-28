import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { validateImageUploadMeta } from '@/lib/images/upload'
import { extractClientIp } from '@/lib/security/ip-hash'
import { runTryOn } from '@/server/try-on/use-case'
import { mapProviderFailure } from '@/server/try-on/provider-errors'
import { fail, ok } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * Rota do provador virtual.
 *
 * - Aceita multipart com: customerSelfieImage, customerFullBodyImage, peca_id, turnstile_token, consent.
 * - As fotos vivem APENAS aqui em memória — descartadas após response (ADR 0006).
 * - Tamanho máx: 8 MB (validação extra além das 4 camadas anti-abuso).
 *
 * Roda em Node runtime (não Edge) porque o polling do FASHN pode passar de 25s.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // segundos

const fieldSchema = z.object({
  peca_id: z.string().uuid('peca_id inválido'),
  turnstile_token: z.string().min(1),
  consent: z.literal('true'),
  session_id: z.string().optional(),
  garment_url_override: z.string().url().optional(),
})

export async function POST(req: NextRequest) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return fail('Payload inválido', 'INVALID_PAYLOAD', 400)
  }

  const fields = Object.fromEntries(formData.entries())
  const parsed = fieldSchema.safeParse(fields)
  if (!parsed.success) return fail('Campos inválidos', 'VALIDATION_ERROR', 400)

  const customerSelfieImage = formData.get('customerSelfieImage')
  if (!(customerSelfieImage instanceof Blob)) {
    return fail('Envie uma selfie para continuar.', 'NO_SELFIE_PHOTO', 400)
  }

  const customerFullBodyImage = formData.get('customerFullBodyImage')
  if (!(customerFullBodyImage instanceof Blob)) {
    return fail('Envie uma foto de corpo inteiro para continuar.', 'NO_FULL_BODY_PHOTO', 400)
  }

  const selfieValidation = validateImageUploadMeta({
    filename: customerSelfieImage instanceof File ? customerSelfieImage.name : 'selfie.webp',
    contentType: customerSelfieImage.type,
    size: customerSelfieImage.size,
  })
  if (!selfieValidation.ok) {
    return fail(
      selfieValidation.message,
      'BAD_SELFIE_IMAGE',
      selfieValidation.message.includes('10 MB') ? 413 : 415,
    )
  }

  const fullBodyValidation = validateImageUploadMeta({
    filename:
      customerFullBodyImage instanceof File ? customerFullBodyImage.name : 'corpo-inteiro.webp',
    contentType: customerFullBodyImage.type,
    size: customerFullBodyImage.size,
  })
  if (!fullBodyValidation.ok) {
    return fail(
      fullBodyValidation.message,
      'BAD_FULL_BODY_IMAGE',
      fullBodyValidation.message.includes('10 MB') ? 413 : 415,
    )
  }

  const selfieBuffer = Buffer.from(await customerSelfieImage.arrayBuffer())
  const customerSelfieDataUrl = `data:${customerSelfieImage.type};base64,${selfieBuffer.toString('base64')}`
  const fullBodyBuffer = Buffer.from(await customerFullBodyImage.arrayBuffer())
  const customerFullBodyDataUrl = `data:${customerFullBodyImage.type};base64,${fullBodyBuffer.toString('base64')}`

  const ip = extractClientIp(req)
  const result = await runTryOn({
    pecaId: parsed.data.peca_id,
    turnstileToken: parsed.data.turnstile_token,
    customerSelfieImage: customerSelfieDataUrl,
    customerFullBodyImage: customerFullBodyDataUrl,
    ip,
    sessionId: parsed.data.session_id,
    garmentImageUrlOverride: parsed.data.garment_url_override,
  })

  if (!result.ok) {
    switch (result.error.kind) {
      case 'kill_switch_off':
        return fail('Provador temporariamente indisponível', 'KILL_SWITCH_OFF', 503)
      case 'turnstile_failed':
        return fail('Verificação de segurança falhou', 'TURNSTILE_FAILED', 403)
      case 'rate_limit':
        return fail(
          'Muitas tentativas. Tente novamente mais tarde.',
          `RATE_LIMIT_${result.error.reason.toUpperCase()}`,
          429,
        )
      case 'quota_exceeded':
        return fail(
          'O provador desta loja atingiu o limite mensal',
          'QUOTA_EXCEEDED',
          429,
        )
      case 'peca_unavailable':
        return fail('Peça indisponível', 'PECA_UNAVAILABLE', 404)
      case 'provider_failed': {
        const detail = result.error.message
        logger.warn('Provider final falhou', { detail })
        const mapped = mapProviderFailure(detail)
        return fail(mapped.message, mapped.code, mapped.status)
      }
    }
  }

  return ok({
    result_url: result.resultUrl,
    expires_at: result.expiresAt,
    provider: result.provider,
  })
}
