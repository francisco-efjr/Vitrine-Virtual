import { z } from 'zod'

/**
 * Validação de variáveis de ambiente em runtime.
 * Falha rápida se faltar algo obrigatório — evita "undefined" surpresa em produção.
 *
 * Use `serverEnv` em código server-only.
 * Use `publicEnv` em qualquer lugar.
 */

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  FASHN_API_KEY: z.string().min(1).optional(),
  FASHN_API_BASE_URL: z.string().url().default('https://api.fashn.ai/v1'),
  REPLICATE_API_TOKEN: z.string().min(1).optional(),
  REPLICATE_VTON_MODEL: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  SUPER_ADMIN_EMAILS: z.string().min(1),
  IP_HASH_SALT: z.string().min(16, 'IP_HASH_SALT deve ter ao menos 16 caracteres'),
  TRY_ON_MONTHLY_BUDGET_USD: z.coerce.number().positive().default(100),
  SENTRY_AUTH_TOKEN: z.string().optional(),
})

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
})

let _serverEnv: z.infer<typeof serverSchema> | null = null
let _publicEnv: z.infer<typeof publicSchema> | null = null

export function getServerEnv(): z.infer<typeof serverSchema> {
  if (typeof window !== 'undefined') {
    throw new Error('getServerEnv() não pode ser chamado no browser')
  }
  if (_serverEnv) return _serverEnv
  const parsed = serverSchema.safeParse(process.env)
  if (!parsed.success) {
    console.error('Variáveis de ambiente server inválidas:', parsed.error.flatten().fieldErrors)
    throw new Error('Variáveis de ambiente server inválidas')
  }
  _serverEnv = parsed.data
  return _serverEnv
}

export function getPublicEnv(): z.infer<typeof publicSchema> {
  if (_publicEnv) return _publicEnv
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  })
  if (!parsed.success) {
    console.error('Variáveis de ambiente public inválidas:', parsed.error.flatten().fieldErrors)
    throw new Error('Variáveis de ambiente public inválidas')
  }
  _publicEnv = parsed.data
  return _publicEnv
}

export function getSuperAdminEmails(): string[] {
  return getServerEnv()
    .SUPER_ADMIN_EMAILS.split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}
