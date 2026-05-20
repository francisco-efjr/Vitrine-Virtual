import type { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  IMAGE_TRY_ON_CUSTOMER_MAX_UPLOAD_BYTES,
  validateImageUploadMeta,
} from '@/lib/images/upload'
import { extractClientIp } from '@/lib/security/ip-hash'
import { runTryOn } from '@/server/try-on/use-case'
import { mapProviderFailure } from '@/server/try-on/provider-errors'
import { fail, ok } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { REJECTION_MESSAGES } from '@/lib/try-on/quality-gate'
import type {
  CustomerPhotoSignals,
  GarmentPhotoSignals,
} from '@/lib/try-on/quality-gate'

/**
 * Rota do provador virtual.
 *
 * - Aceita multipart com: customerPhoto, peca_id, turnstile_token, consent.
 * - A foto vive APENAS aqui em memória — descartada após response (ADR 0006).
 * - Tamanho máx: 60 MB (validação extra além das 4 camadas anti-abuso).
 *
 * Roda em Node runtime (não Edge) porque o polling do FASHN pode passar de 25s.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 180 // segundos — cobre 120s de timeout do fetch + retry + upload

const customerSignalsSchema = z.object({
  shortestSidePx: z.number().int().nonnegative(),
  meanLuminance: z.number().min(0).max(255),
  sharpness: z.number().nonnegative(),
  personCount: z.number().int().nonnegative(),
  faceVisible: z.boolean(),
  faceAreaFraction: z.number().min(0).max(1),
  fullBodyLandmarksOk: z.boolean(),
  poseUpright: z.boolean(),
  targetRegionUnoccluded: z.number().min(0).max(1),
  detectedType: z.enum(['full_body', 'three_quarter', 'mirror', 'selfie', 'partial']),
})

const garmentSignalsSchema = z.object({
  shortestSidePx: z.number().int().nonnegative(),
  detectionConfidence: z.number().min(0).max(1),
  garmentAreaFraction: z.number().min(0).max(1),
  detectedPhotoType: z.enum(['flat-lay', 'model', 'auto']),
  ocrText: z.string().optional(),
})

const fieldSchema = z.object({
  peca_id: z.string().uuid('peca_id inválido'),
  turnstile_token: z.string().min(1),
  consent: z.literal('true'),
  session_id: z.string().optional(),
  garment_url_override: z.string().url().optional(),
  customer_signals: z.string().optional(),
  garment_signals: z.string().optional(),
})

function parseSignals<T>(raw: string | undefined, schema: z.ZodType<T>): T | null {
  if (!raw) return null
  try {
    const json = JSON.parse(raw) as unknown
    const parsed = schema.safeParse(json)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

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

  const customerPhoto = formData.get('customerPhoto')
  if (!(customerPhoto instanceof Blob)) {
    return fail('Envie uma foto para continuar.', 'NO_CUSTOMER_PHOTO', 400)
  }

  const photoValidation = validateImageUploadMeta(
    {
      filename: customerPhoto instanceof File ? customerPhoto.name : 'foto.webp',
      contentType: customerPhoto.type,
      size: customerPhoto.size,
    },
    {
      maxBytes: IMAGE_TRY_ON_CUSTOMER_MAX_UPLOAD_BYTES,
    },
  )
  if (!photoValidation.ok) {
    return fail(
      photoValidation.message,
      'BAD_CUSTOMER_PHOTO',
      photoValidation.message.includes('MB') ? 413 : 415,
    )
  }

  const photoBuffer = Buffer.from(await customerPhoto.arrayBuffer())
  const customerPhotoDataUrl = `data:${customerPhoto.type};base64,${photoBuffer.toString('base64')}`

  const ip = extractClientIp(req)
  const customerSignals = parseSignals<CustomerPhotoSignals>(
    parsed.data.customer_signals,
    customerSignalsSchema,
  )
  const garmentSignals = parseSignals<GarmentPhotoSignals>(
    parsed.data.garment_signals,
    garmentSignalsSchema,
  )

  const result = await runTryOn({
    pecaId: parsed.data.peca_id,
    turnstileToken: parsed.data.turnstile_token,
    customerPhoto: customerPhotoDataUrl,
    ip,
    sessionId: parsed.data.session_id,
    garmentImageUrlOverride: parsed.data.garment_url_override,
    customerSignals,
    garmentSignals,
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
        return fail('O provador desta loja atingiu o limite mensal', 'QUOTA_EXCEEDED', 429)
      case 'peca_unavailable':
        return fail('Peça indisponível', 'PECA_UNAVAILABLE', 404)
      case 'gate_rejected': {
        const msg = REJECTION_MESSAGES[result.error.reason]
        return fail(msg.ptBr, `GATE_${result.error.reason.toUpperCase()}`, 422)
      }
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
    generation_id: result.generationId ?? null,
  })
}
