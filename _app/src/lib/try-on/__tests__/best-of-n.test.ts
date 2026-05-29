import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runWithBestOfN } from '../best-of-n'
import * as tiers from '../tiers'
import * as garmentText from '../acceptance/garment-text'

function fakeResult(resultUrl: string) {
  return {
    tier: 'tier_c_gemini',
    provider: 'google',
    resultUrl,
    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    durationMs: 100,
  } as unknown as Awaited<ReturnType<typeof tiers.runTier>>
}

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.TRY_ON_BEST_OF_N_ENABLED
  delete process.env.TRY_ON_BEST_OF_N_COUNT
  delete process.env.TRY_ON_BEST_OF_N_TIERS
})

const fakeInput = {} as unknown as Parameters<typeof runWithBestOfN>[0]
const fakeBuffer = Buffer.alloc(10)

describe('runWithBestOfN', () => {
  it('feature_disabled → single sample quando flag off', async () => {
    const runTierSpy = vi
      .spyOn(tiers, 'runTier')
      .mockResolvedValue(fakeResult('https://cdn.fashn.ai/r1'))
    const res = await runWithBestOfN(fakeInput, {
      tier: 'tier_c_gemini',
      garmentBuffer: fakeBuffer,
    })
    expect(res.reason).toBe('feature_disabled')
    expect(res.samplesGenerated).toBe(1)
    expect(runTierSpy).toHaveBeenCalledTimes(1)
  })

  it('tier_not_supported → single sample quando tier fora da lista', async () => {
    process.env.TRY_ON_BEST_OF_N_ENABLED = 'true'
    const runTierSpy = vi
      .spyOn(tiers, 'runTier')
      .mockResolvedValue(fakeResult('https://cdn.fashn.ai/r1'))
    const res = await runWithBestOfN(fakeInput, {
      tier: 'tier_c_gemini',
      garmentBuffer: fakeBuffer,
    })
    expect(res.reason).toBe('tier_not_supported')
    expect(runTierSpy).toHaveBeenCalledTimes(1)
  })

  it('ocr_unavailable → single sample quando OCR falha', async () => {
    process.env.TRY_ON_BEST_OF_N_ENABLED = 'true'
    process.env.TRY_ON_BEST_OF_N_TIERS = 'tier_c_gemini'
    vi.spyOn(garmentText, 'detectGarmentText').mockResolvedValue({
      text: '',
      hasText: false,
      source: 'unavailable',
      detail: 'no_api_key',
    })
    const runTierSpy = vi
      .spyOn(tiers, 'runTier')
      .mockResolvedValue(fakeResult('https://cdn.fashn.ai/r1'))
    const res = await runWithBestOfN(fakeInput, {
      tier: 'tier_c_gemini',
      garmentBuffer: fakeBuffer,
    })
    expect(res.reason).toBe('ocr_unavailable')
    expect(runTierSpy).toHaveBeenCalledTimes(1)
  })

  it('ocr_no_text → single sample quando peça não tem texto', async () => {
    process.env.TRY_ON_BEST_OF_N_ENABLED = 'true'
    process.env.TRY_ON_BEST_OF_N_TIERS = 'tier_c_gemini'
    vi.spyOn(garmentText, 'detectGarmentText').mockResolvedValue({
      text: '',
      hasText: false,
      source: 'gemini-vision',
    })
    const runTierSpy = vi
      .spyOn(tiers, 'runTier')
      .mockResolvedValue(fakeResult('https://cdn.fashn.ai/r1'))
    const res = await runWithBestOfN(fakeInput, {
      tier: 'tier_c_gemini',
      garmentBuffer: fakeBuffer,
    })
    expect(res.reason).toBe('ocr_no_text')
    expect(runTierSpy).toHaveBeenCalledTimes(1)
  })

  it('best_of_n_applied → roda N samples quando peça tem texto', async () => {
    process.env.TRY_ON_BEST_OF_N_ENABLED = 'true'
    process.env.TRY_ON_BEST_OF_N_TIERS = 'tier_c_gemini'
    process.env.TRY_ON_BEST_OF_N_COUNT = '2'
    const ocrSpy = vi.spyOn(garmentText, 'detectGarmentText')
    // 1ª chamada: input (peça) → tem texto
    ocrSpy.mockResolvedValueOnce({ text: 'NIKE', hasText: true, source: 'gemini-vision' })
    // chamadas seguintes: scoring dos outputs (cada sample → OCR)
    ocrSpy.mockResolvedValue({ text: 'NIKE', hasText: true, source: 'gemini-vision' })

    const runTierSpy = vi
      .spyOn(tiers, 'runTier')
      .mockResolvedValueOnce(fakeResult('https://cdn.fashn.ai/r1'))
      .mockResolvedValueOnce(fakeResult('https://cdn.fashn.ai/r2'))

    const res = await runWithBestOfN(fakeInput, {
      tier: 'tier_c_gemini',
      garmentBuffer: fakeBuffer,
    })
    expect(res.reason).toBe('best_of_n_applied')
    expect(res.samplesGenerated).toBe(2)
    expect(runTierSpy).toHaveBeenCalledTimes(2)
    expect(res.garmentText).toBe('NIKE')
  })

  it('hard cap N em 4 mesmo se env pedir 10', async () => {
    process.env.TRY_ON_BEST_OF_N_ENABLED = 'true'
    process.env.TRY_ON_BEST_OF_N_TIERS = 'tier_c_gemini'
    process.env.TRY_ON_BEST_OF_N_COUNT = '10'
    vi.spyOn(garmentText, 'detectGarmentText').mockResolvedValue({
      text: 'X',
      hasText: true,
      source: 'gemini-vision',
    })
    const runTierSpy = vi.spyOn(tiers, 'runTier').mockResolvedValue(fakeResult('https://cdn.fashn.ai/r'))
    const res = await runWithBestOfN(fakeInput, {
      tier: 'tier_c_gemini',
      garmentBuffer: fakeBuffer,
    })
    expect(runTierSpy).toHaveBeenCalledTimes(4)
    expect(res.samplesGenerated).toBe(4)
  })
})
