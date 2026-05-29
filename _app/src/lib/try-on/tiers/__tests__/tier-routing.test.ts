import { describe, expect, it } from 'vitest'
import { chooseTier, resolveEnabledTier, type TierRouteContext } from '..'

function ctx(overrides: Partial<TierRouteContext> = {}): TierRouteContext {
  return {
    customerPhotoType: 'full_body',
    garmentPhotoType: 'flat-lay',
    garmentCategory: 'tops',
    backgroundMode: 'white',
    quality: 'quality',
    ...overrides,
  }
}

describe('chooseTier — Tier S routing (P2.14)', () => {
  it('footwear → tier_s_vertex', () => {
    expect(chooseTier(ctx({ garmentCategory: 'footwear' }))).toBe('tier_s_vertex')
  })

  it('footwear ignora outras dicas (e.g. customerPhotoType=selfie)', () => {
    expect(
      chooseTier(ctx({ garmentCategory: 'footwear', customerPhotoType: 'selfie' })),
    ).toBe('tier_s_vertex')
  })

  it('storeModelPreference hard-pin sobrescreve footwear', () => {
    expect(
      chooseTier(
        ctx({ garmentCategory: 'footwear', storeModelPreference: 'tier_c_gemini' }),
      ),
    ).toBe('tier_c_gemini')
  })

  it('tops continua indo pro tier_a_premium (sem footwear)', () => {
    expect(chooseTier(ctx({ garmentCategory: 'tops' }))).toBe('tier_a_premium')
  })
})

describe('resolveEnabledTier fallback', () => {
  it('quando tier_s_vertex está desabilitado, cai pra Tier C', () => {
    // Sem env TRY_ON_TIER_S_ENABLED, tier S handler tem enabled=false
    const handler = resolveEnabledTier('tier_s_vertex')
    expect(handler.tier).toBe('tier_c_gemini')
  })
})
