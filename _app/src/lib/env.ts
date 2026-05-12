import { z } from 'zod'

/**
 * Validação de variáveis de ambiente em runtime.
 *
 * Filosofia: a app sobe **mesmo com .env.local mínimo** — assim o desenvolvedor
 * consegue ver as telas localmente sem precisar configurar tudo de uma vez.
 *
 * Vars obrigatórias (sem elas a app não sobe):
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Vars opcionais (sem elas, a feature correspondente fica desabilitada com
 * mensagem clara em runtime):
 *   - IP_HASH_SALT       → desabilita hash de IP (logs de try-on usam '_')
 *   - SUPER_ADMIN_EMAILS → ninguém é super-admin via whitelist (só via role no banco)
 *   - FASHN_API_KEY      → provador IA retorna erro amigável
 *   - REPLICATE_*        → fallback do try-on indisponível
 *   - UPSTASH_*          → rate limit desabilitado (libera, loga warning)
 *   - TURNSTILE_*        → CAPTCHA desabilitado (aceita 'dev-bypass')
 *   - SENTRY_*           → erros só no console
 */

// =============================================================================
// SERVER ENV — só obrigatórios são fields validados como required
// =============================================================================

const serverSchema = z.object({
  // OBRIGATÓRIOS
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY é obrigatório (Supabase Settings → API)'),

  // OPCIONAIS
  FASHN_API_KEY: z.string().min(1).optional(),
  FASHN_API_BASE_URL: z.string().url().default('https://api.fashn.ai/v1'),
  REPLICATE_API_TOKEN: z.string().min(1).optional(),
  REPLICATE_VTON_MODEL: z.string().min(1).optional(),
  // Google AI (Gemini Nano Banana) — provider de try-on via Google AI Studio
  GOOGLE_AI_API_KEY: z.string().min(1).optional(),
  GOOGLE_AI_MODEL: z.string().min(1).default('gemini-2.5-flash-image'),
  // Tamanho da imagem gerada. Usado apenas por modelos Gemini Image que aceitam
  // generationConfig.imageConfig.imageSize (ex: gemini-3.1-flash-image-preview e
  // gemini-3-pro-image-preview). O gemini-2.5-flash-image retorna resoluções
  // fixas por aspect ratio e não recebe imageSize.
  GOOGLE_AI_IMAGE_SIZE: z.enum(['1K', '2K', '4K']).default('4K'),
  // Aspect ratio do resultado. Fashion typicamente usa 3:4 (vertical).
  GOOGLE_AI_ASPECT_RATIO: z
    .enum(['1:1', '9:16', '16:9', '3:4', '4:3', '4:5', '5:4', '21:9', '9:21'])
    .default('3:4'),
  // OpenAI — provider de try-on via gpt-image-1 (multi-image edits API)
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_IMAGE_MODEL: z.string().min(1).default('gpt-image-1'),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  SUPER_ADMIN_EMAILS: z.string().optional().default(''),
  IP_HASH_SALT: z
    .string()
    .min(16, 'IP_HASH_SALT deve ter ao menos 16 caracteres (gere com: openssl rand -hex 32)')
    .optional(),
  TRY_ON_MONTHLY_BUDGET_USD: z.coerce.number().positive().default(100),
  SENTRY_AUTH_TOKEN: z.string().optional(),
})

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL precisa ser uma URL válida (ex: https://xxx.supabase.co)'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY é obrigatório (Supabase Settings → API)'),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
})

export type ServerEnv = z.infer<typeof serverSchema>
export type PublicEnv = z.infer<typeof publicSchema>

let _serverEnv: ServerEnv | null = null
let _publicEnv: PublicEnv | null = null

// =============================================================================
// Erros customizados (mais úteis que `new Error('msg')`)
// =============================================================================

export class EnvValidationError extends Error {
  constructor(
    public readonly fieldErrors: Record<string, string[] | undefined>,
    public readonly scope: 'server' | 'public',
  ) {
    const fields = Object.entries(fieldErrors)
      .map(([k, v]) => `  - ${k}: ${(v ?? []).join(', ')}`)
      .join('\n')
    super(
      `Variáveis de ambiente ${scope} inválidas:\n${fields}\n\nVerifique seu .env.local. Veja .env.example para referência.`,
    )
    this.name = 'EnvValidationError'
  }
}

export class MissingFeatureEnvError extends Error {
  constructor(featureName: string, requiredVars: string[]) {
    super(
      `A feature "${featureName}" exige as variáveis ${requiredVars.join(', ')} configuradas no .env.local.`,
    )
    this.name = 'MissingFeatureEnvError'
  }
}

// =============================================================================
// Acesso ao env
// =============================================================================

export function getServerEnv(): ServerEnv {
  if (typeof window !== 'undefined' && !process.env.VITEST && process.env.NODE_ENV !== 'test') {
    throw new Error('getServerEnv() não pode ser chamado no browser')
  }
  if (_serverEnv) return _serverEnv
  const parsed = serverSchema.safeParse(process.env)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    // eslint-disable-next-line no-console
    console.error('[env] server inválido:', fieldErrors)
    throw new EnvValidationError(fieldErrors, 'server')
  }
  _serverEnv = parsed.data
  return _serverEnv
}

export function getPublicEnv(): PublicEnv {
  if (_publicEnv) return _publicEnv
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  })
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    // eslint-disable-next-line no-console
    console.error('[env] public inválido:', fieldErrors)
    throw new EnvValidationError(fieldErrors, 'public')
  }
  _publicEnv = parsed.data
  return _publicEnv
}

// =============================================================================
// Helpers de feature (cada um sabe se está habilitado e dá erro útil)
// =============================================================================

export function getSuperAdminEmails(): string[] {
  const raw = getServerEnv().SUPER_ADMIN_EMAILS
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export function isFeatureConfigured(
  feature:
    | 'try_on_fashn'
    | 'try_on_replicate'
    | 'try_on_google'
    | 'try_on_openai'
    | 'rate_limit'
    | 'turnstile'
    | 'ip_hash'
    | 'sentry',
): boolean {
  const env = getServerEnv()
  switch (feature) {
    case 'try_on_fashn':
      return !!env.FASHN_API_KEY
    case 'try_on_replicate':
      return !!(env.REPLICATE_API_TOKEN && env.REPLICATE_VTON_MODEL)
    case 'try_on_google':
      return !!env.GOOGLE_AI_API_KEY
    case 'try_on_openai':
      return !!env.OPENAI_API_KEY
    case 'rate_limit':
      return !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN)
    case 'turnstile':
      return !!env.TURNSTILE_SECRET_KEY
    case 'ip_hash':
      return !!env.IP_HASH_SALT
    case 'sentry':
      return !!env.SENTRY_AUTH_TOKEN
  }
}

export function _resetEnvCache(): void {
  _serverEnv = null
  _publicEnv = null
}
