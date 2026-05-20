import { buildVirtualTryOnPrompt, type VirtualTryOnBackgroundMode } from './virtual-try-on-prompt'
import { composeVariantBlocks, type VariantContext } from './variants'
import { VIRTUAL_TRYON_NEGATIVE_PROMPT } from './negative-prompt'
import type { BackgroundMode, TryOnPromptVariables } from '../tiers/types'

/**
 * Maps the rich `BackgroundMode` ('white' | 'store_background' |
 * 'preserve_customer') used by the tier router down to the two modes the
 * existing master prompt understands ('white' | 'custom').
 *
 * 'preserve_customer' is treated as 'custom' for the prompt body — the
 * variant delta in `variants.ts` carries the actual "preserve original
 * background outside silhouette" instruction.
 */
function legacyBackgroundMode(mode: BackgroundMode): VirtualTryOnBackgroundMode {
  return mode === 'white' ? 'white' : 'custom'
}

export interface ComposedPrompt {
  /** The full prompt body sent to Gemini. */
  prompt: string
  /** Identifier persisted on the generation log for A/B comparison. */
  promptVariantId: string
}

/**
 * Builds the final prompt by concatenating:
 *   1. The master prompt (existing `virtual-try-on-prompt.ts`).
 *   2. The variant deltas appropriate for the input context (section 13).
 *   3. The negative prompt (section 11).
 */
export function composeFinalPrompt(vars: TryOnPromptVariables): ComposedPrompt {
  const master = buildVirtualTryOnPrompt(legacyBackgroundMode(vars.backgroundMode))

  const variantCtx: VariantContext = {
    customerPhotoType: vars.customerPhotoType,
    garmentPhotoType: vars.garmentPhotoType,
    backgroundMode: vars.backgroundMode,
    quality: vars.quality,
    outputStyle: vars.outputStyle,
    storeBackgroundDescription: vars.storeBackgroundDescription,
    storeBackgroundReference: vars.storeBackgroundReference,
  }
  const variantBlocks = composeVariantBlocks(variantCtx)

  const garmentDescriptionBlock = vars.garmentDescription
    ? `GARMENT DESCRIPTION (use as fallback context, not as a substitute for the garment image):
${vars.garmentDescription}`
    : ''

  const blocks = [master, ...variantBlocks, garmentDescriptionBlock, VIRTUAL_TRYON_NEGATIVE_PROMPT]
    .filter((b) => b && b.trim().length > 0)
    .join('\n\n')

  return { prompt: blocks, promptVariantId: vars.promptVariantId }
}
