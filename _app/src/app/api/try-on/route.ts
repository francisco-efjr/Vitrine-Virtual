import type { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  IMAGE_TRY_ON_CUSTOMER_MAX_UPLOAD_BYTES,
  validateImageUploadMeta,
} from '@/lib/images/upload'
import { extractClientIp } from '@/lib/security/ip-hash'
import { isAllowedGarmentUrl } from '@/lib/security/url-allowlist'
import { runTryOn } from '@/server/try-on/use-case'
import { mapProviderFailure } from '@/server/try-on/provider-errors'
import { fail, ok } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { REJECTION_MESSAGES } from '@/lib/try-on/quality-gate'
import type { CustomerPhotoSignals, GarmentPhotoSignals } from '@/lib/try-on/quality-gate'

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
  /**
   * Override de URL da peça para testes/desenvolvimento.
   * SSRF prevention: validado contra allowlist de domínios confiáveis.
   * Qualquer URL fora do allowlist (incluindo IPs internos, localhost,
   * metadata endpoints de cloud) é rejeitada com 400.
   */
  garment_url_override: z
    .string()
    .url('URL inválida')
    .refine(isAllowedGarmentUrl, { message: 'URL de peça não permitida' })
    .optional(),
  customer_signals: z.string().optional(),
  garment_signals: z.string().optional(),
  /**
   * Bypass apenas de aviso leve do AI gate (Gemini Vision) — quando o
   * cliente já tentou e viu uma interrupção continuável, pode decidir
   * "tentar mesmo assim". O servidor ainda valida de novo e nunca libera
   * hard-block de sem rosto/sem pessoa.
   *
   * Vem como string "true" no multipart porque FormData não tem boolean.
   */
  bypass_ai_gate: z.literal('true').optional(),
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

  let result: Awaited<ReturnType<typeof runTryOn>>
  try {
    result = await runTryOn({
      pecaId: parsed.data.peca_id,
      turnstileToken: parsed.data.turnstile_token,
      customerPhoto: customerPhotoDataUrl,
      ip,
      sessionId: parsed.data.session_id,
      garmentImageUrlOverride: parsed.data.garment_url_override,
      customerSignals,
      garmentSignals,
      bypassAiGate: parsed.data.bypass_ai_gate === 'true',
    })
  } catch (err) {
    // Exception fora do contrato `{ok:false, error:...}` — schema novo
    // faltando em prod, provider key vazio, sub-call quebrada, etc.
    // Antes virava "Application error" 500 do Next sem contexto. Agora
    // logamos a classe + mensagem (sem stack, sem PII) e devolvemos
    // JSON estruturado que o frontend renderiza no error step.
    const errName = err instanceof Error ? err.name : 'UnknownError'
    const errMsg = err instanceof Error ? err.message : String(err)
    logger.error('runTryOn exception (out-of-contract)', {
      name: errName,
      message: errMsg,
      peca_id: parsed.data.peca_id,
    })
    return fail(`Não foi possível gerar a visualização. (${errName})`, 'TRY_ON_INTERNAL_ERROR', 500)
  }

  if (!result.ok) {
    switch (result.error.kind) {
      case 'kill_switch_off':
        return fail('Provador temporariamente indisponível', 'KILL_SWITCH_OFF', 503)
      case 'turnstile_failed':
        return fail('Verificação de segurança falhou', 'TURNSTILE_FAILED', 403)
      case 'rate_limit': {
        // RFC 6585 §4: 429 deve incluir Retry-After.
        // resetAt vem do Upstash em ms — convertemos para segundos.
        const retryAfterSecs = result.error.resetAt
          ? Math.max(1, Math.ceil((result.error.resetAt - Date.now()) / 1000))
          : 60
        return fail(
          'Muitas tentativas. Tente novamente mais tarde.',
          `RATE_LIMIT_${result.error.reason.toUpperCase()}`,
          429,
          { 'Retry-After': String(retryAfterSecs) },
        )
      }
      case 'quota_exceeded':
        // Cota mensal — orienta a aguardar até o próximo mês (aproximado em horas).
        return fail('O provador desta loja atingiu o limite mensal', 'QUOTA_EXCEEDED', 429, {
          'Retry-After': '3600',
        })
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
      case 'parental_consent_required':
        return fail(
          'Detectamos que a pessoa na foto pode ser menor de idade. Marque o consentimento parental para continuar.',
          `PARENTAL_CONSENT_REQUIRED_${result.error.bracket.toUpperCase()}`,
          422,
        )
      case 'sensitive_garment_consent_required':
        return fail(
          'Esta peça requer consentimento explícito para experimentação virtual. Marque a opção e tente novamente.',
          `SENSITIVE_GARMENT_CONSENT_REQUIRED_${result.error.category.toUpperCase()}`,
          422,
        )
    }
    // Falha de tipagem se algum case ficou de fora
    return fail('Erro desconhecido', 'UNKNOWN_ERROR', 500)
  }

  return ok({
    result_url: result.resultUrl,
    expires_at: result.expiresAt,
    provider: result.provider,
    generation_id: result.generationId ?? null,
  })
}
