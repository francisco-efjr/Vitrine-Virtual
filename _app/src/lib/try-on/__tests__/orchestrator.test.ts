import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { _resetEnvCache } from '@/lib/env'
import { fashnProvider } from '../fashn'
import { googleAiProvider } from '../google-ai'
import { generateTryOn } from '../orchestrator'
import { replicateProvider } from '../replicate'
import { TryOnProviderError, type TryOnProvider, type TryOnProviderInput } from '../types'

const ORIGINAL_ENV = { ...process.env }

function makeProvider(
  name: 'fashn' | 'replicate',
  behavior: 'ok' | 'retry' | 'fatal',
): TryOnProvider {
  return {
    name,
    generate: vi.fn(async () => {
      if (behavior === 'ok') {
        return {
          resultUrl: `https://${name}.example.com/r.jpg`,
          requestId: `${name}-1`,
          durationMs: 100,
          expiresAt: new Date(Date.now() + 86400_000).toISOString(),
        }
      }
      if (behavior === 'retry') {
        throw new TryOnProviderError(`${name} 503`, name, true)
      }
      throw new TryOnProviderError(`${name} 400`, name, false)
    }),
  }
}

describe('orchestrator.generateTryOn', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    _resetEnvCache()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
    _resetEnvCache()
    vi.restoreAllMocks()
  })

  const input: TryOnProviderInput = {
    customer: {
      photoImage: 'data:image/jpeg;base64,foto',
    },
    references: {
      customerReferenceImage: 'data:image/jpeg;base64,foto',
    },
    product: {
      productImage: 'https://x.com/g.jpg',
    },
    background: {
      mode: 'white',
    },
  }

  it('retorna resultado do primário quando ele responde', async () => {
    const fashn = makeProvider('fashn', 'ok')
    const replicate = makeProvider('replicate', 'ok')
    const result = await generateTryOn(input, [fashn, replicate])
    expect(result.provider).toBe('fashn')
    expect(replicate.generate).not.toHaveBeenCalled()
  })

  it('cai para fallback quando primário tem erro retriável', async () => {
    const fashn = makeProvider('fashn', 'retry')
    const replicate = makeProvider('replicate', 'ok')
    const result = await generateTryOn(input, [fashn, replicate])
    expect(result.provider).toBe('replicate')
    expect(fashn.generate).toHaveBeenCalledOnce()
    expect(replicate.generate).toHaveBeenCalledOnce()
  })

  it('NÃO cai para fallback quando primário tem erro definitivo (não retriable)', async () => {
    const fashn = makeProvider('fashn', 'fatal')
    const replicate = makeProvider('replicate', 'ok')
    await expect(generateTryOn(input, [fashn, replicate])).rejects.toBeInstanceOf(
      TryOnProviderError,
    )
    expect(replicate.generate).not.toHaveBeenCalled()
  })

  it('lança erro se todos providers falharem', async () => {
    const fashn = makeProvider('fashn', 'retry')
    const replicate = makeProvider('replicate', 'retry')
    await expect(generateTryOn(input, [fashn, replicate])).rejects.toBeInstanceOf(
      TryOnProviderError,
    )
  })

  it('usa Nano Banana como primeiro provider default quando configurado', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
      GOOGLE_AI_API_KEY: 'google-test-key',
      FASHN_API_KEY: 'fashn-test-key',
      REPLICATE_API_TOKEN: 'replicate-test-token',
      REPLICATE_VTON_MODEL: 'replicate-test-model',
    }
    _resetEnvCache()

    const resultPayload = {
      resultUrl: 'https://google.example.com/r.jpg',
      requestId: 'google-1',
      durationMs: 100,
      expiresAt: new Date(Date.now() + 86400_000).toISOString(),
    }
    const googleGenerate = vi.spyOn(googleAiProvider, 'generate').mockResolvedValue(resultPayload)
    const fashnGenerate = vi.spyOn(fashnProvider, 'generate').mockResolvedValue({
      ...resultPayload,
      requestId: 'fashn-1',
    })
    const replicateGenerate = vi.spyOn(replicateProvider, 'generate').mockResolvedValue({
      ...resultPayload,
      requestId: 'replicate-1',
    })

    const result = await generateTryOn(input)

    expect(result.provider).toBe('google')
    expect(googleGenerate).toHaveBeenCalledOnce()
    expect(fashnGenerate).not.toHaveBeenCalled()
    expect(replicateGenerate).not.toHaveBeenCalled()
  })
})
