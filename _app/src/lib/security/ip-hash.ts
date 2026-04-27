import { createHash } from 'node:crypto'
import { getServerEnv, isFeatureConfigured } from '@/lib/env'
import { logger } from '@/lib/logger'

/**
 * LGPD: IP é dado pessoal. Nunca logamos IP cru.
 * Hasheamos com SHA-256 + salt para permitir rate-limiting e auditoria
 * sem armazenar o valor reidentificável.
 *
 * Sem IP_HASH_SALT configurado:
 *   - Em produção: lança erro (precisamos ter pra LGPD)
 *   - Em desenvolvimento: usa um placeholder fixo + warning no log,
 *     pra não bloquear o desenvolvedor que ainda não preencheu .env.local
 */
const DEV_PLACEHOLDER_HASH = 'dev-no-ip-hash-configured-' + 'a'.repeat(32)
const DEV_FALLBACK_SALT = 'DEV_ONLY_INSECURE_SALT__SET__IP_HASH_SALT__IN_ENV_LOCAL'

export function hashIp(ip: string): string {
  if (!isFeatureConfigured('ip_hash')) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'IP_HASH_SALT não configurado em produção. LGPD exige hash de IP. ' +
          'Configure a variável (gere com: openssl rand -hex 32).',
      )
    }
    logger.warn(
      'IP_HASH_SALT não configurado — usando salt de DEV. NÃO SUBA PARA PRODUÇÃO ASSIM.',
    )
    return createHash('sha256').update(`${DEV_FALLBACK_SALT}:${ip}`).digest('hex')
  }
  const salt = getServerEnv().IP_HASH_SALT!
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

/** Sentinela usada por testes para verificar comportamento sem env. */
export const _DEV_PLACEHOLDER = DEV_PLACEHOLDER_HASH
