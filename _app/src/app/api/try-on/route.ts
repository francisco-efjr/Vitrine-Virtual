import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { extractClientIp } from '@/lib/security/ip-hash'
import { runTryOn } from '@/server/try-on/use-case'
import { fail, ok } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * Rota do provador virtual.
 *
 * - Aceita multipart com: foto (File), peca_id (string), turnstile_token (string), consent ('true').
 * - Foto vive APENAS aqui em memória — descartada após response (ADR 0006).
 * - Tamanho máx: 8 MB (validação extra além das 4 camadas anti-abuso).
 *
 * Roda em Node runtime (não Edge) porque o polling do FASHN pode passar de 25s.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // segundos

const MAX_PHOTO_BYTES = 8 * 1024 * 1024
const ACCEPTED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const fieldSchema = z.object({
  peca_id: z.string().uuid('peca_id inválido'),
  turnstile_token: z.string().min(1),
  consent: z.literal('true'),
  session_id: z.string().optional(),
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

  const foto = formData.get('foto')
  if (!(foto instanceof Blob)) return fail('Foto obrigatória', 'NO_PHOTO', 400)
  if (foto.size > MAX_PHOTO_BYTES) return fail('Foto maior que 8 MB', 'PHOTO_TOO_LARGE', 413)
  if (!ACCEPTED_MIMES.has(foto.type)) return fail('Formato de foto não aceito', 'BAD_MIME', 415)

  // Converte foto para data URL — vive em memória apenas durante este request.
  const buf = Buffer.from(await foto.arrayBuffer())
  const dataUrl = `data:${foto.type};base64,${buf.toString('base64')}`

  const ip = extractClientIp(req)
  const result = await runTryOn({
    pecaId: parsed.data.peca_id,
    turnstileToken: parsed.data.turnstile_token,
    modelImage: dataUrl,
    ip,
    sessionId: parsed.data.session_id,
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
      case 'provider_failed':
        logger.warn('Provider final falhou', { msg: result.error.message })
        return fail('Não foi possível gerar a simulação agora', 'PROVIDER_FAILED', 502)
    }
  }

  return ok({
    result_url: result.resultUrl,
    expires_at: result.expiresAt,
    provider: result.provider,
  })
}
