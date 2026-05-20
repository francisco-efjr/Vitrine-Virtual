import 'server-only'
import { logger } from '@/lib/logger'
import { TierNotImplementedError, type TryOnTierHandler, type TryOnTierInput, type TryOnTierResult } from './types'

/**
 * Tier B — Single-Call FASHN (Economy).
 *
 * Status: **STUB / NOT IMPLEMENTED.**
 *
 * Same budget reasoning as Tier A — FASHN is a paid API. We keep this file
 * to preserve the future shape: when budget arrives, you may want a cheap
 * "FASHN-only, balanced mode, preserve customer background" path that costs
 * about $0.04 per image but skips the Gemini polish pass.
 *
 * Implementation when funded:
 *   - Reuse the *same* FASHN call from `tier-a-premium.ts` Stage 1, but with:
 *       mode = "balanced"  (instead of "quality")
 *       background handling: pass through customer photo background.
 *   - No Stage 2.
 *   - Run only the lightweight acceptance checks (no Stage-2 retry loop).
 *
 * Enablement flag: `TRY_ON_TIER_B_ENABLED=true`.
 */
export const tierBEconomy: TryOnTierHandler = {
  tier: 'tier_b_economy',
  enabled: process.env.TRY_ON_TIER_B_ENABLED === 'true', // OFF by default
  description:
    'Single-call FASHN Tryon v1.6 in balanced mode. Not wired today.',

  async run(_input: TryOnTierInput): Promise<TryOnTierResult> {
    logger.warn('Try-on tier: Tier B invoked but not implemented')
    throw new TierNotImplementedError(
      'tier_b_economy',
      'Reuse the FASHN call from tier-a-premium.ts Stage 1 with mode="balanced" and no Stage 2.',
    )
  },
}
