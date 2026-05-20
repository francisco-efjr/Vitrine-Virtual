import type {
  BackgroundMode,
  CustomerPhotoType,
  GarmentPhotoType,
  OutputStyle,
  QualityMode,
} from '../tiers/types'

/**
 * Prompt variant deltas — research deliverable section 13.
 *
 * These are SHORT, additive blocks appended to the master prompt
 * (`virtual-try-on-prompt.ts`). Each variant covers one orthogonal axis
 * (garment input, customer input, background mode, quality, output style).
 *
 * Multiple variants can apply at once. The composer (`composeVariants`)
 * concatenates them in a stable order so we can A/B them by `promptVariantId`.
 */

// ─── Garment-input variants (Section 13.1 / 13.2) ───────────────────────────

export const GARMENT_FLATLAY_DELTA = `GARMENT INPUT NOTE
The garment image is a flat-lay or ghost-mannequin product photo. There is
no other person in it. Reconstruct realistic three-dimensional drape on the
customer's body, including natural folds at the shoulders, chest, waist,
and (if applicable) hips and knees.`

export const GARMENT_ON_MODEL_DELTA = `GARMENT INPUT NOTE
The garment image shows the item worn by another person or model. Transfer
ONLY the garment. Do not transfer the other person's face, body, pose,
hairstyle, skin tone, makeup, accessories, jewelry, shoes, or background.
The garment must be re-fitted to the body and pose of the customer.`

export function garmentInputDelta(type: GarmentPhotoType): string {
  if (type === 'flat-lay') return GARMENT_FLATLAY_DELTA
  if (type === 'model') return GARMENT_ON_MODEL_DELTA
  // 'auto' — let the model decide; emit a neutral guard.
  return `GARMENT INPUT NOTE
The garment image may be either a flat-lay product photo or worn by another
person. If another person is present, transfer ONLY the garment — never the
other person's face, body, accessories, or background.`
}

// ─── Customer-input variants (Section 13.3 – 13.6) ──────────────────────────

export const CUSTOMER_FULL_BODY_DELTA = `CUSTOMER INPUT NOTE
The customer photo is a full-body photo. Use the existing pose if natural,
or re-stage to a neutral standing pose facing the camera if the pose
obscures the garment area. Preserve face, body, and proportions exactly.`

export const CUSTOMER_THREE_QUARTER_DELTA = `CUSTOMER INPUT NOTE
The customer photo is a three-quarter shot. Extend the visible body
downward only as much as is needed to render the garment, while
preserving every visible detail — face, hair, neck, shoulders, torso,
and skin tone — exactly as shown.`

export const CUSTOMER_MIRROR_DELTA = `CUSTOMER INPUT NOTE
The customer photo is a mirror photo. Remove any phone, hand-on-phone
gesture, or visible camera. Do not flip any text on the garment. Re-stage
the customer to face the camera directly in a neutral standing pose, while
keeping the face, body, and hairstyle exactly as in the customer photo.`

export const CUSTOMER_PARTIAL_DELTA = `CUSTOMER INPUT NOTE
The customer photo shows only part of the body (head and torso, or head
and upper body). You may extend the body downward to render the garment,
but you MUST preserve the visible portion exactly — face, hair, neck,
shoulders, and skin tone. Extended limbs and lower body must be plausible
and consistent with the visible portion (same body type, same skin tone).
This variant is ONLY allowed for tops and outerwear; never use it for
bottoms or one-pieces — the use-case layer must reject those upstream.`

export const CUSTOMER_SELFIE_DELTA = `CUSTOMER INPUT NOTE
The customer photo is a head-and-shoulders selfie. Treat the face, hair,
neck, and collar area as identity-locked source. Render the rest of the
body as a plausible extension, in proportion to the visible head and
shoulders. Use a neutral standing pose. This variant is ONLY allowed for
tops and accessories; never use it for bottoms or one-pieces — the
use-case layer must reject those upstream.`

export function customerInputDelta(type: CustomerPhotoType): string {
  switch (type) {
    case 'full_body':
      return CUSTOMER_FULL_BODY_DELTA
    case 'three_quarter':
      return CUSTOMER_THREE_QUARTER_DELTA
    case 'mirror':
      return CUSTOMER_MIRROR_DELTA
    case 'partial':
      return CUSTOMER_PARTIAL_DELTA
    case 'selfie':
      return CUSTOMER_SELFIE_DELTA
  }
}

// ─── Background variants (Section 13.7 – 13.9) ──────────────────────────────

export const BACKGROUND_WHITE_DELTA = `BACKGROUND NOTE
Seamless pure white studio background (#FFFFFF). Softbox lighting from
front-left. A subtle soft contact shadow at the feet, no harsh shadows
elsewhere. No floor pattern, no props, no text.`

export function backgroundStoreDelta(description?: string, hasReferenceImage = false): string {
  if (hasReferenceImage) {
    return `BACKGROUND NOTE
Place the subject in the environment shown in the BACKGROUND_IMAGE
reference. Match the direction, color temperature, and softness of the
reference's lighting. Rebuild the floor shadow accordingly. Do NOT import
any people, props, furniture, or text from the reference — environment
cues only.`
  }
  return `BACKGROUND NOTE
Place the subject in this environment:
${description ?? 'a clean, minimal, premium studio environment'}.
Match the lighting and floor shadow to that environment. Do not invent
people, props, or text.`
}

export const BACKGROUND_PRESERVE_CUSTOMER_DELTA = `BACKGROUND NOTE
Preserve the original background from the customer photo outside the
person's silhouette. Inside the silhouette, render the person wearing
the garment. At the silhouette edge, harmonize lighting direction and
color so the composite is seamless and there is no visible cut-out edge.`

export function backgroundDelta(
  mode: BackgroundMode,
  opts: { storeBackgroundDescription?: string; storeBackgroundReference?: string } = {},
): string {
  switch (mode) {
    case 'white':
      return BACKGROUND_WHITE_DELTA
    case 'store_background':
      return backgroundStoreDelta(opts.storeBackgroundDescription, Boolean(opts.storeBackgroundReference))
    case 'preserve_customer':
      return BACKGROUND_PRESERVE_CUSTOMER_DELTA
  }
}

// ─── Quality + style hints (Section 10.4 / 10.5) ────────────────────────────

export function qualityHint(mode: QualityMode): string {
  switch (mode) {
    case 'fast':
      return 'QUALITY MODE: Prioritize a clean, plausible result in the shortest time. Acceptable to slightly soften micro-details.'
    case 'balanced':
      return 'QUALITY MODE: Balance speed and quality. Preserve garment micro-details and identity above all else.'
    case 'quality':
      return 'QUALITY MODE: Maximum realism. Preserve fabric texture fidelity and identity, even if generation takes longer. Render fine details — stitching, fabric weave, individual hairs at the hairline, eye catchlights.'
  }
}

export function styleHint(style: OutputStyle): string {
  switch (style) {
    case 'premium_studio':
      return 'OUTPUT STYLE: Magazine-editorial fashion photography, clean and minimal, slight film-grain feel.'
    case 'lifestyle':
      return 'OUTPUT STYLE: Natural lifestyle fashion photography, candid feel, still photorealistic.'
    case 'lookbook':
      return 'OUTPUT STYLE: Modern lookbook photography, even soft lighting, neutral mood.'
  }
}

// ─── Composer ───────────────────────────────────────────────────────────────

export interface VariantContext {
  customerPhotoType: CustomerPhotoType
  garmentPhotoType: GarmentPhotoType
  backgroundMode: BackgroundMode
  quality: QualityMode
  outputStyle: OutputStyle
  storeBackgroundDescription?: string
  storeBackgroundReference?: string
}

/**
 * Returns the ordered list of variant blocks for a given context, ready to
 * be joined onto the master prompt. Stable order is important for A/B
 * testing — DO NOT shuffle.
 */
export function composeVariantBlocks(ctx: VariantContext): string[] {
  return [
    garmentInputDelta(ctx.garmentPhotoType),
    customerInputDelta(ctx.customerPhotoType),
    backgroundDelta(ctx.backgroundMode, {
      storeBackgroundDescription: ctx.storeBackgroundDescription,
      storeBackgroundReference: ctx.storeBackgroundReference,
    }),
    qualityHint(ctx.quality),
    styleHint(ctx.outputStyle),
  ]
}
