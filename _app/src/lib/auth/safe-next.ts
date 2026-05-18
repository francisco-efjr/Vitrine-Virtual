/**
 * Proteção contra open redirect no parâmetro `?next=`.
 *
 * Fonte de verdade única, usada por:
 *   - /api/auth/callback (magic link / recuperação)
 *   - login-form (login por senha)  ← BUG-007: antes usava `next` cru
 *
 * Regra: só aceita paths internos absolutos sob a whitelist de prefixos.
 * Qualquer URL externa, protocol-relative (`//evil`) ou fora da whitelist
 * cai no fallback.
 */
export const ALLOWED_NEXT_PREFIXES = ['/admin', '/redefinir-senha'] as const
export const DEFAULT_NEXT = '/admin'

export function safeNext(input: string | null | undefined, fallback: string = DEFAULT_NEXT): string {
  if (!input) return fallback
  if (!input.startsWith('/')) return fallback
  if (input.startsWith('//')) return fallback // protocol-relative → externo
  if (input.startsWith('/\\')) return fallback // backslash trick
  if (!ALLOWED_NEXT_PREFIXES.some((p) => input === p || input.startsWith(`${p}/`))) {
    return fallback
  }
  return input
}
