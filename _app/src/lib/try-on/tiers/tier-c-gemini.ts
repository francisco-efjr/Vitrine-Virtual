import 'server-only'
import { logger } from '@/lib/logger'
import { googleAiProvider } from '../google-ai'
import type { TryOnTierHandler, TryOnTierInput, TryOnTierResult } from './types'

/**
 * Tier C — Identity-Critical / Single-Call Path.
 *
 * Status: **ACTIVE** (the only live tier).
 *
 * What it does:
 *   - One call to Google Gemini 2.5 Flash Image (Nano Banana) with the existing
 *     `virtual-try-on-prompt.ts` template, executed via `googleAiProvider`.
 *   - Cheap (~ $0.039 per 1024² image), fast (3–10 s), commercial-friendly,
 *     strong on face/identity preservation.
 *   - Weakest spot vs. a dedicated VTON model is garment micro-detail
 *     (small prints, exact text on garments). Mitigated by the prompt
 *     variants in `prompts/variants.ts` and by acceptance checks
 *     (see `acceptance/`).
 *
 * Why this is the only active tier today:
 *   - Budget constraint: we are NOT paying for FASHN, Kling, Flux, or
 *     Replicate. Tier A / Tier B remain stubs (see `tier-a-premium.ts`).
 *
 * Cost & latency reference (May 2026):
 *   - Gemini 2.5 Flash Image:  ~ $0.039 per 1024² image,   3–10 s p50.
 */
export const tierCGemini: TryOnTierHandler = {
  tier: 'tier_c_gemini',
  enabled: true,
  description:
    'Single-call Gemini 2.5 Flash Image. Active default tier while Tier A / Tier B are not funded.',

  async run(input: TryOnTierInput): Promise<TryOnTierResult> {
    logger.info('Try-on tier: Tier C (Gemini) start', {
      promptVariantId: input.variables.promptVariantId,
      customerPhotoType: input.variables.customerPhotoType,
      garmentPhotoType: input.variables.garmentPhotoType,
      backgroundMode: input.variables.backgroundMode,
      quality: input.variables.quality,
    })

    const result = await googleAiProvider.generate(input.provider)

    return {
      ...result,
      tier: 'tier_c_gemini',
      provider: googleAiProvider.name,
    }
  },
}
