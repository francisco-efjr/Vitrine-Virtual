import 'server-only'
import { getServerEnv } from '@/lib/env'
import { logger } from '@/lib/logger'

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Camada 1 anti-abuso (ADR 0004): valida token do Cloudflare Turnstile.
 *
 * Em desenvolvimento sem TURNSTILE_SECRET_KEY configurada, valida=true (libera).
 * Em produção, sempre valida.
 */
export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
  const env = getServerEnv()
  if (!env.TURNSTILE_SECRET_KEY) {
    logger.warn('Turnstile não configurado — token aceito sem validação (DEV)')
    return true
  }

  try {
    const body = new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
      ...(ip ? { remoteip: ip } : {}),
    })
    const r = await fetch(VERIFY_URL, { method: 'POST', body })
    if (!r.ok) {
      logger.warn('Turnstile verify HTTP fail', { status: r.status })
      return false
    }
    const data = (await r.json()) as { success: boolean; 'error-codes'?: string[] }
    if (!data.success) {
      logger.warn('Turnstile verify rejeitado', { codes: data['error-codes'] })
    }
    return data.success
  } catch (err) {
    logger.error('Turnstile verify exception', {
      message: err instanceof Error ? err.message : String(err),
    })
    return false
  }
}
