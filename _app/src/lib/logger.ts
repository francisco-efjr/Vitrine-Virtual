/**
 * Logger sanitizado.
 * ADR 0006 + LGPD: nunca logamos foto, IP cru, e-mail, senha ou qualquer dado pessoal.
 *
 * Em produção pode ser plugado em Sentry/Datadog. No MVP, console estruturado basta.
 */

type Level = 'debug' | 'info' | 'warn' | 'error'

const FORBIDDEN_KEYS = new Set([
  'password',
  'senha',
  'token',
  'authorization',
  'api_key',
  'apikey',
  'secret',
  'foto',
  'photo',
  'image',
  'ip',
  'email',
  'phone',
  'whatsapp',
])

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[Truncated: too deep]'
  if (value == null) return value
  if (typeof value === 'string') {
    return value.length > 500 ? value.slice(0, 500) + '…[truncated]' : value
  }
  if (typeof value !== 'object') return value
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((v) => sanitize(v, depth + 1))
  }
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(k.toLowerCase())) {
      out[k] = '[REDACTED]'
    } else {
      out[k] = sanitize(v, depth + 1)
    }
  }
  return out
}

function log(level: Level, message: string, meta?: Record<string, unknown>): void {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta: sanitize(meta) } : {}),
  }
  // eslint-disable-next-line no-console
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  fn(JSON.stringify(payload))
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
}
