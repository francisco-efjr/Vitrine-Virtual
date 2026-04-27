import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { _resetEnvCache } from '@/lib/env'
import { extractClientIp, hashIp } from '../ip-hash'

const ORIGINAL_ENV = { ...process.env }

function setEnv(overrides: Record<string, string | undefined>) {
  for (const k of Object.keys(overrides)) {
    if (overrides[k] === undefined) delete process.env[k]
    else process.env[k] = overrides[k]
  }
  _resetEnvCache()
}

describe('hashIp', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    _resetEnvCache()
  })
  afterEach(() => {
    process.env = ORIGINAL_ENV
    _resetEnvCache()
    vi.restoreAllMocks()
  })

  it('hash determinístico para mesmo IP+salt', () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k', IP_HASH_SALT: 'salty-mc-saltface-123' })
    expect(hashIp('1.2.3.4')).toBe(hashIp('1.2.3.4'))
  })

  it('hashes diferentes para IPs diferentes', () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k', IP_HASH_SALT: 'salty-mc-saltface-123' })
    expect(hashIp('1.2.3.4')).not.toBe(hashIp('1.2.3.5'))
  })

  it('hashes diferentes para mesmo IP com salts diferentes', () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k', IP_HASH_SALT: 'salt-aaa-aaaaaaaaaa' })
    const a = hashIp('1.2.3.4')
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k', IP_HASH_SALT: 'salt-bbb-bbbbbbbbbb' })
    const b = hashIp('1.2.3.4')
    expect(a).not.toBe(b)
  })

  it('hash é hex de 64 caracteres (SHA-256)', () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k', IP_HASH_SALT: 'salty-mc-saltface-123' })
    const h = hashIp('192.168.0.1')
    expect(h).toMatch(/^[0-9a-f]{64}$/)
  })

  it('em DEV sem IP_HASH_SALT, usa fallback e loga warning', () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k', IP_HASH_SALT: undefined, NODE_ENV: 'development' })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const h = hashIp('1.1.1.1')
    expect(h).toMatch(/^[0-9a-f]{64}$/)
    expect(warnSpy).toHaveBeenCalled()
  })

  it('em PRODUÇÃO sem IP_HASH_SALT, lança erro (LGPD)', () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k', IP_HASH_SALT: undefined, NODE_ENV: 'production' })
    expect(() => hashIp('1.1.1.1')).toThrowError(/LGPD/)
  })
})

describe('extractClientIp', () => {
  function req(headers: Record<string, string>): Request {
    return new Request('http://x.com', { headers })
  }

  it('lê x-forwarded-for (primeiro IP da lista)', () => {
    expect(extractClientIp(req({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('1.2.3.4')
  })

  it('lê x-real-ip se não tem xff', () => {
    expect(extractClientIp(req({ 'x-real-ip': '9.9.9.9' }))).toBe('9.9.9.9')
  })

  it('lê cf-connecting-ip se não tem os outros', () => {
    expect(extractClientIp(req({ 'cf-connecting-ip': '8.8.8.8' }))).toBe('8.8.8.8')
  })

  it('preferência: xff > x-real-ip > cf-connecting-ip', () => {
    expect(
      extractClientIp(
        req({
          'x-forwarded-for': 'A.A.A.A',
          'x-real-ip': 'B.B.B.B',
          'cf-connecting-ip': 'C.C.C.C',
        }),
      ),
    ).toBe('A.A.A.A')
  })

  it('retorna 0.0.0.0 quando nenhum header presente', () => {
    expect(extractClientIp(req({}))).toBe('0.0.0.0')
  })

  it('lida com xff com espaços', () => {
    expect(extractClientIp(req({ 'x-forwarded-for': '  10.0.0.1  ,  20.0.0.1' }))).toBe('10.0.0.1')
  })
})
