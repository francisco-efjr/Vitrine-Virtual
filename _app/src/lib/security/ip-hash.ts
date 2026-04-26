import { createHash } from 'node:crypto'
import { getServerEnv } from '@/lib/env'

/**
 * LGPD: IP é dado pessoal. Nunca logamos IP cru.
 * Hasheamos com SHA-256 + salt para permitir rate-limiting e auditoria
 * sem armazenar o valor reidentificável.
 *
 * Uso típico:
 *   const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
 *   const hash = hashIp(ip)
 */
export function hashIp(ip: string): string {
  const salt = getServerEnv().IP_HASH_SALT
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}

/** Extrai o IP do cliente de uma Request, considerando proxies (Vercel/Cloudflare). */
export function extractClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const real = req.headers.get('x-real-ip')
  if (real) return real
  const cf = req.headers.get('cf-connecting-ip')
  if (cf) return cf
  return '0.0.0.0'
}
