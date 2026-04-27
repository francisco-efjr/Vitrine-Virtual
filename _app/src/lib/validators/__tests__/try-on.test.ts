import { describe, expect, it } from 'vitest'
import { tryOnRequestSchema, tryOnResultSchema } from '../try-on'

describe('tryOnRequestSchema', () => {
  it('aceita payload válido', () => {
    const r = tryOnRequestSchema.safeParse({
      peca_id: '11111111-1111-1111-1111-111111111111',
      turnstile_token: 'cf-token-abc',
      consent: true,
    })
    expect(r.success).toBe(true)
  })

  it('rejeita peca_id não-uuid', () => {
    const r = tryOnRequestSchema.safeParse({
      peca_id: 'not-uuid',
      turnstile_token: 'tok',
      consent: true,
    })
    expect(r.success).toBe(false)
  })

  it('rejeita turnstile_token vazio', () => {
    const r = tryOnRequestSchema.safeParse({
      peca_id: '11111111-1111-1111-1111-111111111111',
      turnstile_token: '',
      consent: true,
    })
    expect(r.success).toBe(false)
  })

  it('rejeita consent diferente de true (precisa ser explícito)', () => {
    const base = {
      peca_id: '11111111-1111-1111-1111-111111111111',
      turnstile_token: 'tok',
    }
    expect(tryOnRequestSchema.safeParse({ ...base, consent: false }).success).toBe(false)
    expect(tryOnRequestSchema.safeParse({ ...base, consent: 'true' }).success).toBe(false)
    expect(tryOnRequestSchema.safeParse({ ...base }).success).toBe(false) // sem consent
  })
})

describe('tryOnResultSchema', () => {
  it('aceita resultado válido', () => {
    const r = tryOnResultSchema.safeParse({
      result_url: 'https://cdn.fashn.ai/result/abc.jpg',
      provider: 'fashn',
      duration_ms: 8500,
      expires_at: new Date(Date.now() + 86400_000).toISOString(),
    })
    expect(r.success).toBe(true)
  })

  it('rejeita provider inválido', () => {
    const r = tryOnResultSchema.safeParse({
      result_url: 'https://x.com/r.jpg',
      provider: 'kling', // não é fashn nem replicate
      duration_ms: 100,
      expires_at: new Date().toISOString(),
    })
    expect(r.success).toBe(false)
  })

  it('rejeita duration_ms negativa', () => {
    const r = tryOnResultSchema.safeParse({
      result_url: 'https://x.com/r.jpg',
      provider: 'fashn',
      duration_ms: -1,
      expires_at: new Date().toISOString(),
    })
    expect(r.success).toBe(false)
  })

  it('rejeita result_url não-URL', () => {
    const r = tryOnResultSchema.safeParse({
      result_url: 'not-a-url',
      provider: 'fashn',
      duration_ms: 100,
      expires_at: new Date().toISOString(),
    })
    expect(r.success).toBe(false)
  })

  it('rejeita expires_at não-ISO', () => {
    const r = tryOnResultSchema.safeParse({
      result_url: 'https://x.com/r.jpg',
      provider: 'fashn',
      duration_ms: 100,
      expires_at: '2026-04-26',
    })
    expect(r.success).toBe(false)
  })
})
