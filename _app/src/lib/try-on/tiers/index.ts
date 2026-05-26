import 'server-only'
import { logger } from '@/lib/logger'
import { tierAPremium } from './tier-a-premium'
import { tierBEconomy } from './tier-b-economy'
import { tierCGemini } from './tier-c-gemini'
import type {
  TryOnTier,
  TryOnTierHandler,
  TryOnTierInput,
  TryOnTierResult,
} from './types'

export { TierNotImplementedError } from './types'
export type {
  BackgroundMode,
  CustomerPhotoType,
  GarmentCategory,
  GarmentPhotoType,
  OutputStyle,
  QualityMode,
  TryOnPromptVariables,
  TryOnTier,
  TryOnTierHandler,
  TryOnTierInput,
  TryOnTierResult,
} from './types'

const ALL_TIERS: readonly TryOnTierHandler[] = [tierAPremium, tierBEconomy, tierCGemini]

/**
 * Inputs the router uses to decide which tier to run.
 * This is intentionally a small surface area; everything else lives in
 * `TryOnPromptVariables` and is consumed by the tier handler itself.
 */
export interface TierRouteContext {
  /** Hard pin from store admin. If set and the tier is enabled, it wins. */
  storeModelPreference?: TryOnTier | 'auto'
  /** Filled by the quality gate; selfie-only blocks bottoms/one-pieces today. */
  customerPhotoType:
    | 'full_body'
    | 'three_quarter'
    | 'mirror'
    | 'selfie'
    | 'partial'
  /**
   * Detected on the garment image (auto-detected server-side when unknown).
   * When 'model', the garment image shows another person modeling the item,
   * which triggers a stronger routing preference for Tier A (FASHN) when
   * available — FASHN's dedicated VTON pipeline handles on-model garments
   * better than Gemini's multi-image fusion.
   */
  garmentPhotoType?: 'flat-lay' | 'model' | 'auto'
  garmentCategory:
    | 'tops'
    | 'bottoms'
    | 'one-pieces'
    | 'outerwear'
    | 'swimwear'
    | 'accessories'
    | 'auto'
  backgroundMode: 'white' | 'store_background' | 'preserve_customer'
  quality: 'fast' | 'balanced' | 'quality'
}

/**
 * Pure decision function. Tested separately. Always returns a tier id; the
 * caller (`runTier`) is responsible for falling back if the chosen tier is
 * not enabled.
 *
 * Routing rules (research section 4):
 *   - Hard pin overrides everything when the pinned tier is enabled.
 *   - garmentPhotoType === 'model' → Tier A (FASHN) when available, because
 *     Gemini's multi-image fusion can produce a collage when both inputs
 *     contain a person. FASHN is purpose-built for on-model garment transfer.
 *     Falls back to Tier C when FASHN is not enabled (router does the
 *     fallback in `resolveEnabledTier`).
 *   - Identity-sensitive cases (selfie, partial, mirror) → Tier C (Gemini-led
 *     identity preservation is its strength).
 *   - quality === 'fast' AND backgroundMode === 'preserve_customer' → Tier B.
 *   - Default → Tier A (premium two-pass) when available.
 *   - If a "premium" tier is requested but disabled, fall back to Tier C.
 */
export function chooseTier(ctx: TierRouteContext): TryOnTier {
  if (ctx.storeModelPreference && ctx.storeModelPreference !== 'auto') {
    return ctx.storeModelPreference
  }

  // On-model garment: prefer FASHN. When FASHN is disabled, resolveEnabledTier
  // routes back to Tier C — same as today, but with the stronger 'auto' /
  // 'model' garment delta + collage post-check kicking in at the provider.
  if (ctx.garmentPhotoType === 'model') return 'tier_a_premium'

  const identitySensitive =
    ctx.customerPhotoType === 'selfie' ||
    ctx.customerPhotoType === 'partial' ||
    ctx.customerPhotoType === 'mirror'

  if (identitySensitive) return 'tier_c_gemini'

  if (ctx.quality === 'fast' && ctx.backgroundMode === 'preserve_customer') {
    return 'tier_b_economy'
  }

  return 'tier_a_premium'
}

/**
 * Resolves chosen tier to an actually enabled handler, falling back to the
 * always-on Tier C if the chosen tier is a stub. Logs the routing decision
 * for the feedback dashboard.
 */
export function resolveEnabledTier(chosen: TryOnTier): TryOnTierHandler {
  const handler = ALL_TIERS.find((t) => t.tier === chosen)
  if (handler && handler.enabled) return handler

  logger.info('Try-on router: chosen tier disabled, falling back to Tier C', {
    chosen,
    reason: handler ? 'disabled_by_env_flag' : 'unknown_tier',
  })
  return tierCGemini
}

/**
 * High-level entry point used by the use-case layer.
 *
 *   import { runTier, chooseTier } from '@/lib/try-on/tiers'
 *
 *   const tier = chooseTier(routeCtx)
 *   const result = await runTier(tier, tierInput)
 */
export async function runTier(
  chosen: TryOnTier,
  input: TryOnTierInput,
): Promise<TryOnTierResult> {
  const handler = resolveEnabledTier(chosen)
  logger.info('Try-on tier dispatch', {
    chosen,
    effective: handler.tier,
    enabled: handler.enabled,
  })
  return handler.run(input)
}

export const TIERS = ALL_TIERS
