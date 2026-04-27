import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  EnvValidationError,
  _resetEnvCache,
  getPublicEnv,
  getServerEnv,
  getSuperAdminEmails,
  isFeatureConfigured,
} from '@/lib/env'

const ORIGINAL_ENV = { ...process.env }

function setEnv(overrides: Record<string, string | undefined>) {
  for (const k of Object.keys(overrides)) {
    if (overrides[k] === undefined) delete process.env[k]
    else process.env[k] = overrides[k]
  }
  _resetEnvCache()
}

describe('env: getServerEnv', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    _resetEnvCache()
  })
  afterEach(() => {
    process.env = ORIGINAL_ENV
    _resetEnvCache()
  })

  it('aceita config mínima (apenas SUPABASE_SERVICE_ROLE_KEY)', () => {
    setEnv({
      SUPABASE_SERVICE_ROLE_KEY: 'sk_test_abc',
      IP_HASH_SALT: undefined,
      SUPER_ADMIN_EMAILS: undefined,
      FASHN_API_KEY: undefined,
    })
    const env = getServerEnv()
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe('sk_test_abc')
    expect(env.SUPER_ADMIN_EMAILS).toBe('') // default
    expect(env.IP_HASH_SALT).toBeUndefined()
    expect(env.FASHN_API_KEY).toBeUndefined()
  })

  it('lança EnvValidationError quando SUPABASE_SERVICE_ROLE_KEY falta', () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: undefined })
    expect(() => getServerEnv()).toThrowError(EnvValidationError)
  })

  it('lança erro com lista detalhada de campos inválidos', () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: undefined })
    try {
      getServerEnv()
      throw new Error('deveria ter lançado')
    } catch (err) {
      expect(err).toBeInstanceOf(EnvValidationError)
      const e = err as EnvValidationError
      expect(e.fieldErrors).toHaveProperty('SUPABASE_SERVICE_ROLE_KEY')
      expect(e.scope).toBe('server')
      expect(e.message).toMatch(/SUPABASE_SERVICE_ROLE_KEY/)
    }
  })

  it('rejeita IP_HASH_SALT muito curto', () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k', IP_HASH_SALT: 'curto' })
    expect(() => getServerEnv()).toThrowError(EnvValidationError)
  })

  it('aceita IP_HASH_SALT com 16+ chars', () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k', IP_HASH_SALT: '0123456789abcdef0' })
    expect(getServerEnv().IP_HASH_SALT).toBeDefined()
  })

  it('aplica defaults: FASHN_API_BASE_URL e TRY_ON_MONTHLY_BUDGET_USD', () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k' })
    const env = getServerEnv()
    expect(env.FASHN_API_BASE_URL).toBe('https://api.fashn.ai/v1')
    expect(env.TRY_ON_MONTHLY_BUDGET_USD).toBe(100)
  })

  it('TRY_ON_MONTHLY_BUDGET_USD coerciona string para number', () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k', TRY_ON_MONTHLY_BUDGET_USD: '250' })
    expect(getServerEnv().TRY_ON_MONTHLY_BUDGET_USD).toBe(250)
  })

  it('cacheia o resultado entre chamadas', () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'cached' })
    const a = getServerEnv()
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'novo'
    const b = getServerEnv()
    expect(a).toBe(b) // mesma referência
    expect(b.SUPABASE_SERVICE_ROLE_KEY).toBe('cached')
  })
})

describe('env: getPublicEnv', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    _resetEnvCache()
  })
  afterEach(() => {
    process.env = ORIGINAL_ENV
    _resetEnvCache()
  })

  it('aceita config mínima', () => {
    setEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon_x',
    })
    const env = getPublicEnv()
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://x.supabase.co')
    expect(env.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000') // default
  })

  it('rejeita NEXT_PUBLIC_SUPABASE_URL não-URL', () => {
    setEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'k',
    })
    expect(() => getPublicEnv()).toThrowError(EnvValidationError)
  })
})

describe('env: getSuperAdminEmails', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    _resetEnvCache()
  })
  afterEach(() => {
    process.env = ORIGINAL_ENV
    _resetEnvCache()
  })

  it('retorna [] quando SUPER_ADMIN_EMAILS está vazio', () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k', SUPER_ADMIN_EMAILS: '' })
    expect(getSuperAdminEmails()).toEqual([])
  })

  it('parseia lista separada por vírgula, normaliza para lowercase', () => {
    setEnv({
      SUPABASE_SERVICE_ROLE_KEY: 'k',
      SUPER_ADMIN_EMAILS: 'Foo@Bar.com, BAZ@QUX.com,  spaces@ok.com  ',
    })
    expect(getSuperAdminEmails()).toEqual([
      'foo@bar.com',
      'baz@qux.com',
      'spaces@ok.com',
    ])
  })

  it('ignora entradas vazias', () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k', SUPER_ADMIN_EMAILS: 'a@b.com,,  ,c@d.com' })
    expect(getSuperAdminEmails()).toEqual(['a@b.com', 'c@d.com'])
  })
})

describe('env: isFeatureConfigured', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    _resetEnvCache()
  })
  afterEach(() => {
    process.env = ORIGINAL_ENV
    _resetEnvCache()
  })

  it('try_on_fashn: true só se FASHN_API_KEY está setado', () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k', FASHN_API_KEY: undefined })
    expect(isFeatureConfigured('try_on_fashn')).toBe(false)
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k', FASHN_API_KEY: 'fk' })
    expect(isFeatureConfigured('try_on_fashn')).toBe(true)
  })

  it('try_on_replicate: exige token E model', () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k', REPLICATE_API_TOKEN: 'rt' })
    expect(isFeatureConfigured('try_on_replicate')).toBe(false) // sem model
    setEnv({
      SUPABASE_SERVICE_ROLE_KEY: 'k',
      REPLICATE_API_TOKEN: 'rt',
      REPLICATE_VTON_MODEL: 'm',
    })
    expect(isFeatureConfigured('try_on_replicate')).toBe(true)
  })

  it('rate_limit: exige Upstash URL E token', () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k' })
    expect(isFeatureConfigured('rate_limit')).toBe(false)
    setEnv({
      SUPABASE_SERVICE_ROLE_KEY: 'k',
      UPSTASH_REDIS_REST_URL: 'https://x.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'tk',
    })
    expect(isFeatureConfigured('rate_limit')).toBe(true)
  })

  it('ip_hash: true só com IP_HASH_SALT >= 16 chars', () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k' })
    expect(isFeatureConfigured('ip_hash')).toBe(false)
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k', IP_HASH_SALT: '0123456789abcdef0' })
    expect(isFeatureConfigured('ip_hash')).toBe(true)
  })

  it('turnstile e sentry seguem mesma lógica', () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k' })
    expect(isFeatureConfigured('turnstile')).toBe(false)
    expect(isFeatureConfigured('sentry')).toBe(false)
    setEnv({
      SUPABASE_SERVICE_ROLE_KEY: 'k',
      TURNSTILE_SECRET_KEY: 'ts',
      SENTRY_AUTH_TOKEN: 'st',
    })
    expect(isFeatureConfigured('turnstile')).toBe(true)
    expect(isFeatureConfigured('sentry')).toBe(true)
  })
})
