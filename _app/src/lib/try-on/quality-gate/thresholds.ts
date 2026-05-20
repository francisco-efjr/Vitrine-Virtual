/**
 * Tunable thresholds for the quality gate — research deliverable section 5.1.
 *
 * Keep these in ONE file so the feedback loop (section 9.3 — rejection-rule
 * tuning) can be auto-A/B-tested by simply swapping numeric values without
 * touching any branching logic.
 *
 * Units:
 *   - sharpness is a Laplacian variance computed on a 1024-pixel short-side
 *     grayscale conversion of the input image. See research section 5.1.
 *   - luminance is a 0–255 mean over the grayscale image.
 *   - face area is the face bbox area divided by full image area.
 *   - target-region-unoccluded is the fraction of the garment body region
 *     (torso for tops, legs for bottoms, full body for one-pieces) that is
 *     NOT covered by hands, hair, props, etc.
 */

export const CUSTOMER_PHOTO_THRESHOLDS = {
  /** Hard reject below this short-side resolution (pixels). */
  minShortestSidePx: 512,

  /** Reject below this sharpness; warn between [warn..ok]; ok above. */
  sharpness: { reject: 60, warn: 100 },

  /** Hard reject if mean luminance is outside this range. */
  luminance: { hardReject: { lo: 25, hi: 240 }, warn: { lo: 40, hi: 220 } },

  /** Person detection confidence required to count a person. */
  personDetectionMinConfidence: 0.7,

  /** Reject if more than one person occupies more than this fraction. */
  secondPersonMaxAreaFraction: 0.15,

  /** Face area must be at least this fraction of the full image. */
  faceMinAreaFraction: 0.08,

  /** Target body region (drives "partial body" / "selfie" branches). */
  targetRegionOcclusion: { reject: 0.5, warn: 0.7 },
} as const

export const GARMENT_PHOTO_THRESHOLDS = {
  minShortestSidePx: 512,
  /** Drop below this and we cannot reliably classify the garment. */
  detectionMinConfidence: 0.6,
  /** Warn if the garment occupies less than this fraction. */
  garmentMinAreaFractionWarn: 0.25,
} as const

/** Generation-side acceptance criteria — research section 14. */
export const ACCEPTANCE_THRESHOLDS = {
  /** Face-embedding cosine similarity required to ship the result. */
  identitySimilarityMin: 0.55,
  /** Max ΔE2000 between the source garment patch and the generated one. */
  garmentColorMaxDeltaE: 8,
  /** OCR text mismatch tolerance (edit distance). */
  ocrEditDistanceMax: 1,
  /** Minimum delivered image short-side (post-upscale). */
  minOutputShortestSidePx: 768,
} as const
