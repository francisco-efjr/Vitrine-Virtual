import type { TryOnProvider, TryOnProviderInput, TryOnProviderResult } from '../types'

/**
 * Tiered Try-On strategy.
 *
 * The research deliverable
 * (VITRINE_VIRTUAL_TRY_ON_RESEARCH_AND_PROMPT_SYSTEM.md, sections 4, 10, 13)
 * defines three execution tiers. The product currently runs **only Tier C**
 * because that is the single provider we can pay for today (Google Gemini
 * 2.5 Flash Image, a.k.a. Nano Banana).
 *
 * - tier_a_premium  → FASHN v1.6 (Stage 1) + Gemini (Stage 2 polish).
 *                     **NOT WIRED YET** — see `tier-a-premium.ts` for the
 *                     contract the dev must implement when budget arrives.
 * - tier_b_economy  → Single FASHN call. Not wired. Same reason.
 * - tier_c_gemini   → Single Gemini call. **ACTIVE.**
 */
export type TryOnTier = 'tier_a_premium' | 'tier_b_economy' | 'tier_c_gemini'

export type CustomerPhotoType =
  | 'full_body'
  | 'three_quarter'
  | 'mirror'
  | 'selfie'
  | 'partial'

export type GarmentPhotoType = 'flat-lay' | 'model' | 'auto'

export type BackgroundMode = 'white' | 'store_background' | 'preserve_customer'

export type QualityMode = 'fast' | 'balanced' | 'quality'

export type OutputStyle = 'premium_studio' | 'lifestyle' | 'lookbook'

export type GarmentCategory =
  | 'tops'
  | 'bottoms'
  | 'one-pieces'
  | 'outerwear'
  | 'swimwear'
  | 'accessories'
  | 'auto'

/**
 * Resolved variables that the prompt template needs.
 * Mirrors section 12 of the research document.
 */
export interface TryOnPromptVariables {
  customerPhotoType: CustomerPhotoType
  garmentPhotoType: GarmentPhotoType
  garmentCategory: GarmentCategory
  garmentDescription?: string
  backgroundMode: BackgroundMode
  storeBackgroundDescription?: string
  storeBackgroundReference?: string
  quality: QualityMode
  outputStyle: OutputStyle
  /** Versioned id for A/B-able prompts (feedback loop, section 9.2). */
  promptVariantId: string
  /** Optional deterministic seed for retries / debugging. */
  seed?: number
  /** Reserved for FASHN content moderation parameter when Tier A is wired. */
  safetyLevel: 'conservative' | 'permissive'
  /** Cláusula de prompt opcional sobre o material da peça (P2.11). Quando
   *  presente é injetada no compose pra empurrar drape/sheen/textura corretos. */
  fabricPromptClause?: string
}

export interface TryOnTierInput {
  provider: TryOnProviderInput
  variables: TryOnPromptVariables
}

export interface TryOnTierResult extends TryOnProviderResult {
  tier: TryOnTier
  /** Provider final que gerou a imagem entregue ao cliente (para auditoria). */
  provider: TryOnProvider['name']
}

/**
 * A tier handler. Tier A and Tier B are stubs today; Tier C is the live path.
 */
export interface TryOnTierHandler {
  readonly tier: TryOnTier
  readonly enabled: boolean
  readonly description: string
  run(input: TryOnTierInput): Promise<TryOnTierResult>
}

export class TierNotImplementedError extends Error {
  constructor(public readonly tier: TryOnTier, hint?: string) {
    super(
      `Tier "${tier}" is not implemented yet. ` +
        (hint ?? 'See _app/src/lib/try-on/tiers/README.md for the integration checklist.'),
    )
    this.name = 'TierNotImplementedError'
  }
}
