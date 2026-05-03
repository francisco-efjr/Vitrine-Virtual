import { describe, expect, it, vi } from 'vitest'
import { generateTryOn } from '../orchestrator'
import { TryOnProviderError, type TryOnProvider } from '../types'

function makeProvider(name: 'fashn' | 'replicate', behavior: 'ok' | 'retry' | 'fatal'): TryOnProvider {
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
  const input = {
    customer: {
      selfieImage: 'data:image/jpeg;base64,selfie',
      fullBodyImage: 'data:image/jpeg;base64,body',
    },
    references: {
      faceReferenceImage: 'data:image/jpeg;base64,selfie',
      bodyReferenceImage: 'data:image/jpeg;base64,body',
    },
    product: {
      productImage: 'https://x.com/g.jpg',
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
})
