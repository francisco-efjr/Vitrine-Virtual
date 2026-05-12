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
 * Cliente do Replicate — provider de fallback (modelo IDM-VTON).
 * Latência maior (20–40s) mas custo menor.
 */
export const replicateProvider: TryOnProvider = {
  name: 'replicate',

  async generate(input: TryOnProviderInput): Promise<TryOnProviderResult> {
    const env = getServerEnv()
    if (!env.REPLICATE_API_TOKEN || !env.REPLICATE_VTON_MODEL) {
      throw new TryOnProviderError('Replicate não configurado', 'replicate', false)
    }
    if (input.background.mode === 'custom') {
      throw new TryOnProviderError('Replicate não suporta fundo personalizado', 'replicate', true)
    }
    const t0 = Date.now()

    // Replicate cria predictions e nós fazemos polling
    const submit = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        Prefer: 'wait=60',
      },
      body: JSON.stringify({
        version: env.REPLICATE_VTON_MODEL.split(':')[1],
        input: {
          human_img: input.references.customerReferenceImage,
          garm_img: input.product.productImage,
          garment_des: 'clothing',
          category: 'upper_body',
        },
      }),
    })

    if (!submit.ok) {
      const txt = await submit.text().catch(() => '')
      logger.warn('Replicate submit failed', { status: submit.status, body: txt.slice(0, 200) })
      throw new TryOnProviderError(
        `Replicate submit ${submit.status}`,
        'replicate',
        submit.status >= 500 || submit.status === 429,
      )
    }

    const data = (await submit.json()) as {
      id: string
      status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
      output?: string | string[]
      error?: string
    }

    if (data.status === 'succeeded') {
      const url = Array.isArray(data.output) ? data.output[0] : data.output
      if (!url) throw new TryOnProviderError('Replicate sem output', 'replicate', true)
      return {
        resultUrl: url,
        requestId: data.id,
        durationMs: Date.now() - t0,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }
    }
    if (data.status === 'failed') {
      throw new TryOnProviderError(
        `Replicate failed: ${data.error ?? 'unknown'}`,
        'replicate',
        false,
      )
    }
    throw new TryOnProviderError('Replicate timeout', 'replicate', true)
  },
}
