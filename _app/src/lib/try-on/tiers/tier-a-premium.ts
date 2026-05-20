import 'server-only'
import { logger } from '@/lib/logger'
import { TierNotImplementedError, type TryOnTierHandler, type TryOnTierInput, type TryOnTierResult } from './types'

/**
 * Tier A — Premium Two-Pass Path.
 *
 * Status: **STUB / NOT IMPLEMENTED.**
 *
 * Why it is a stub:
 *   - Tier A requires a paid FASHN API subscription (~ $0.04–$0.075 per image)
 *     plus the existing Google Gemini call. The product currently has no
 *     budget for FASHN, so we ship Tier C only and keep this file as a
 *     well-documented contract that the dev can fill in later.
 *
 * What this file is FOR:
 *   - To preserve the integration shape so that, on the day budget arrives,
 *     turning Tier A on is a *configuration change* and an *implementation
 *     of the body of `run`* — nothing else in the orchestrator, payload,
 *     prompts, or use-case has to change.
 *
 * What the dev must implement when Tier A is funded:
 *
 *   STAGE 1 — Garment transfer (FASHN Tryon v1.6)
 *   -------------------------------------------------------------
 *   Endpoint:  POST https://api.fashn.ai/v1/run
 *   Auth:      Authorization: Bearer ${FASHN_API_KEY}
 *   Headers:   X-No-Retention: true   (ADR 0006 — never persist customer photo)
 *   Body:
 *     {
 *       "model_name": "tryon-v1.6",
 *       "inputs": {
 *         "model_image": <signed URL to customer photo>,
 *         "garment_image": <signed URL to garment photo>,
 *         "category": variables.garmentCategory,           // "tops" | ...
 *         "garment_photo_type": variables.garmentPhotoType, // "auto" | ...
 *         "mode": variables.quality,                        // "quality" recommended
 *         "moderation_level": variables.safetyLevel === 'conservative' ? 'conservative' : 'permissive',
 *         "num_samples": 1,
 *         "output_format": "png",
 *         "seed": variables.seed ?? undefined,
 *       }
 *     }
 *   Then poll GET /v1/status/{prediction_id} until status === 'completed'.
 *   See the existing `fashn.ts` for a working polling loop — most of it is
 *   reusable.
 *
 *   STAGE 2 — Background + lighting + face anchor (Gemini)
 *   -------------------------------------------------------------
 *   - Take Stage 1 output as input image A (the "person-with-garment").
 *   - Take the ORIGINAL customer photo as input image B (identity anchor).
 *   - If `backgroundMode === 'store_background'` with a reference, pass the
 *     reference as image C and use the variant from `prompts/variants.ts`.
 *   - Call Gemini 2.5 Flash Image with a refinement prompt that says
 *     "preserve garment exactly from A; re-anchor face from B; recompose
 *     background per backgroundMode; harmonize lighting".
 *
 *   ACCEPTANCE CHECKS — Run between stages
 *   -------------------------------------------------------------
 *   - After Stage 1: identity-similarity (see `acceptance/identity-check.ts`).
 *     If similarity is already > 0.65, you MAY skip Stage 2.
 *   - After Stage 2: full acceptance suite (see `acceptance/index.ts`).
 *
 *   ENABLEMENT FLAG
 *   -------------------------------------------------------------
 *   - Add `TRY_ON_TIER_A_ENABLED=true` to `.env.local` to flip `enabled` to
 *     true. Until then this handler stays disabled and the router routes
 *     everything to Tier C.
 *
 *   COST GUARD
 *   -------------------------------------------------------------
 *   - Tier A approx. cost per generation: $0.10–$0.14.
 *     Update the per-store quota math in `server/try-on/quota.ts` accordingly.
 *
 * Until all of the above is implemented, `run` throws
 * `TierNotImplementedError`. The router (`./index.ts`) checks `enabled`
 * before dispatch and will never call this handler in production today.
 */
export const tierAPremium: TryOnTierHandler = {
  tier: 'tier_a_premium',
  enabled: process.env.TRY_ON_TIER_A_ENABLED === 'true', // OFF by default
  description:
    'Two-pass premium: FASHN Tryon v1.6 (garment fidelity) → Gemini 2.5 Flash Image (background + face anchor). Not wired today.',

  async run(_input: TryOnTierInput): Promise<TryOnTierResult> {
    logger.warn('Try-on tier: Tier A invoked but not implemented')
    throw new TierNotImplementedError(
      'tier_a_premium',
      'Read _app/src/lib/try-on/tiers/tier-a-premium.ts top comment for the full integration checklist before implementing.',
    )
  },
}
