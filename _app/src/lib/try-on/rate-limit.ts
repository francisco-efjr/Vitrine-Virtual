import 'server-only'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { getServerEnv } from '@/lib/env'

/**
 * Camada 2 anti-abuso (ADR 0004): rate limit por IP via Upstash Redis.
 *
 * Limites default (definidos no design + brief):
 * - 5 try-ons / hora
 * - 20 try-ons / dia
 * - 50 try-ons / semana
 *
 * Usa sliding window — janela móvel mais justa que fixed window.
 */

let _redis: Redis | null = null
function getRedis(): Redis | null {
  const env = getServerEnv()
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null
  if (_redis) return _redis
  _redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  })
  return _redis
}

let _hourly: Ratelimit | null = null
let _daily: Ratelimit | null = null
let _weekly: Ratelimit | null = null

export interface RateLimitResult {
  ok: boolean
  reason?: 'hour' | 'day' | 'week'
  reset?: number
  remaining?: number
}

export async function checkTryOnRateLimit(ipHash: string): Promise<RateLimitResult> {
  const redis = getRedis()
  if (!redis) {
    // Em dev sem Upstash configurado, libera (mas loga). Em prod sempre tem.
    return { ok: true }
  }

  if (!_hourly) {
    _hourly = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'),
      prefix: 'try-on:hour',
      analytics: false,
    })
    _daily = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 d'),
      prefix: 'try-on:day',
      analytics: false,
    })
    _weekly = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(50, '7 d'),
      prefix: 'try-on:week',
      analytics: false,
    })
  }

  const [h, d, w] = await Promise.all([
    _hourly.limit(ipHash),
    _daily!.limit(ipHash),
    _weekly!.limit(ipHash),
  ])

  if (!h.success) return { ok: false, reason: 'hour', reset: h.reset, remaining: 0 }
  if (!d.success) return { ok: false, reason: 'day', reset: d.reset, remaining: 0 }
  if (!w.success) return { ok: false, reason: 'week', reset: w.reset, remaining: 0 }

  return { ok: true, remaining: Math.min(h.remaining, d.remaining, w.remaining) }
}
