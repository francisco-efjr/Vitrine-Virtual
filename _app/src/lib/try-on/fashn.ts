import 'server-only'
import { getServerEnv } from '@/lib/env'
import { logger } from '@/lib/logger'
import {
  TryOnProviderError,
  type TryOnProvider,
  type TryOnProviderInput,
  type TryOnProviderResult,
} from './types'

/**
 * Cliente do FASHN.ai — provider primário do provador virtual.
 *
 * IMPORTANTE: ADR 0006 — sempre passa header X-No-Retention para opt-out
 * de armazenamento da imagem do cliente final no lado do FASHN.
 */
export const fashnProvider: TryOnProvider = {
  name: 'fashn',

  async generate(input: TryOnProviderInput): Promise<TryOnProviderResult> {
    const env = getServerEnv()
    if (!env.FASHN_API_KEY) {
      throw new TryOnProviderError('FASHN_API_KEY não configurada', 'fashn', false)
    }
    const t0 = Date.now()

    // 1. Submit job
    const submit = await fetch(`${env.FASHN_API_BASE_URL}/run`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.FASHN_API_KEY}`,
        'Content-Type': 'application/json',
        'X-No-Retention': 'true',
      },
      body: JSON.stringify({
        model_image: input.modelImage,
        garment_image: input.garmentImage,
        category: 'auto',
        mode: 'balanced',
      }),
    })

    if (!submit.ok) {
      const txt = await submit.text().catch(() => '')
      logger.warn('FASHN submit failed', { status: submit.status, body: txt.slice(0, 200) })
      throw new TryOnProviderError(
        `FASHN submit ${submit.status}`,
        'fashn',
        submit.status >= 500 || submit.status === 429,
      )
    }

    const submitData = (await submit.json()) as { id: string }
    const requestId = submitData.id

    // 2. Poll status (até 60s, intervalos de 1s)
    const maxAttempts = 60
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 1000))
      const status = await fetch(`${env.FASHN_API_BASE_URL}/status/${requestId}`, {
        headers: { Authorization: `Bearer ${env.FASHN_API_KEY}` },
      })
      if (!status.ok) {
        throw new TryOnProviderError(`FASHN status ${status.status}`, 'fashn', true)
      }
      const data = (await status.json()) as {
        status: 'starting' | 'in_queue' | 'processing' | 'completed' | 'failed'
        output?: string[]
        error?: { name: string; message: string }
      }

      if (data.status === 'completed' && data.output?.[0]) {
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        return {
          resultUrl: data.output[0],
          requestId,
          durationMs: Date.now() - t0,
          expiresAt: expires,
        }
      }
      if (data.status === 'failed') {
        throw new TryOnProviderError(
          `FASHN failed: ${data.error?.message ?? 'unknown'}`,
          'fashn',
          false,
        )
      }
    }

    throw new TryOnProviderError('FASHN timeout (60s)', 'fashn', true)
  },
}
