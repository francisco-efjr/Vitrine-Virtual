import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { _resetEnvCache } from '@/lib/env'
import { verifyTurnstileToken } from '../turnstile'

const ORIGINAL_ENV = { ...process.env }

function setEnv(overrides: Record<string, string | undefined>) {
  for (const k of Object.keys(overrides)) {
    if (overrides[k] === undefined) delete process.env[k]
    else process.env[k] = overrides[k]
  }
  _resetEnvCache()
}

describe('verifyTurnstileToken', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    _resetEnvCache()
  })
  afterEach(() => {
    process.env = ORIGINAL_ENV
    _resetEnvCache()
    vi.restoreAllMocks()
  })

  it('retorna true sem TURNSTILE_SECRET_KEY (modo DEV)', async () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k', TURNSTILE_SECRET_KEY: undefined })
    vi.spyOn(console, 'log').mockImplementation(() => {}) // silencia logger.warn
    expect(await verifyTurnstileToken('any-token')).toBe(true)
  })

  it('valida token contra Cloudflare e retorna true em sucesso', async () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k', TURNSTILE_SECRET_KEY: 'secret' })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    )
    expect(await verifyTurnstileToken('good-token', '1.2.3.4')).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('retorna false quando Cloudflare rejeita o token', async () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k', TURNSTILE_SECRET_KEY: 'secret' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }),
        { status: 200 },
      ),
    )
    vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(await verifyTurnstileToken('bad-token')).toBe(false)
  })

  it('retorna false quando Cloudflare responde HTTP error', async () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k', TURNSTILE_SECRET_KEY: 'secret' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 500 }))
    vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(await verifyTurnstileToken('token')).toBe(false)
  })

  it('retorna false quando fetch lança exceção (network down)', async () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k', TURNSTILE_SECRET_KEY: 'secret' })
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await verifyTurnstileToken('token')).toBe(false)
  })

  it('inclui IP do cliente no body quando passado', async () => {
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: 'k', TURNSTILE_SECRET_KEY: 'secret' })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    )
    await verifyTurnstileToken('token', '5.5.5.5')
    const callArgs = fetchMock.mock.calls[0]
    const body = (callArgs![1] as RequestInit).body
    const params = new URLSearchParams(body as string)
    expect(params.get('remoteip')).toBe('5.5.5.5')
    expect(params.get('response')).toBe('token')
    expect(params.get('secret')).toBe('secret')
  })
})
