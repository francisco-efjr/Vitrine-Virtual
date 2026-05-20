import type { RejectionReason } from './rejection-messages'

/**
 * Quality-gate types — research deliverable section 5.
 *
 * Three verdicts: proceed / proceed_with_warning / reject.
 * Every gated input carries the raw signals so we can correlate them with
 * customer feedback (research section 9.3, rejection-rule tuning).
 */

export type GateVerdict = 'proceed' | 'proceed_with_warning' | 'reject'

export type CustomerPhotoType =
  | 'full_body'
  | 'three_quarter'
  | 'mirror'
  | 'selfie'
  | 'partial'

export interface CustomerPhotoSignals {
  /** Decoded RGB resolution (shortest side, pixels). */
  shortestSidePx: number
  /** Mean luminance, 0–255. */
  meanLuminance: number
  /** Laplacian variance, normalized to a 1024px short side. */
  sharpness: number
  personCount: number
  faceVisible: boolean
  /** Fraction of image area covered by the face bbox (0–1). */
  faceAreaFraction: number
  /** Required pose landmarks present (nose, shoulders, hips, knees, ankles). */
  fullBodyLandmarksOk: boolean
  poseUpright: boolean
  /** Fraction of the garment target body region that is unoccluded. */
  targetRegionUnoccluded: number
  /** What kind of photo this looks like (drives the prompt variant). */
  detectedType: CustomerPhotoType
}

export interface GarmentPhotoSignals {
  shortestSidePx: number
  detectionConfidence: number
  /** Fraction of image covered by the garment. */
  garmentAreaFraction: number
  detectedPhotoType: 'flat-lay' | 'model' | 'auto'
  /** OCR text inside the garment region — used by acceptance checks. */
  ocrText?: string
}

export interface GateResult {
  verdict: GateVerdict
  reason?: RejectionReason
  signals: CustomerPhotoSignals | GarmentPhotoSignals
  /** Optional set of secondary reasons for analytics. */
  warnings: RejectionReason[]
}

/** Allowed (customer_photo_type, garment_category) pairs. */
export const ALLOWED_TYPE_CATEGORY_PAIRS: ReadonlyArray<{
  customer: CustomerPhotoType
  categories: ReadonlyArray<'tops' | 'bottoms' | 'one-pieces' | 'outerwear' | 'swimwear' | 'accessories' | 'auto'>
}> = [
  { customer: 'full_body', categories: ['tops', 'bottoms', 'one-pieces', 'outerwear', 'swimwear', 'accessories', 'auto'] },
  { customer: 'three_quarter', categories: ['tops', 'outerwear', 'accessories', 'auto'] },
  { customer: 'mirror', categories: ['tops', 'bottoms', 'one-pieces', 'outerwear', 'swimwear', 'accessories', 'auto'] },
  { customer: 'partial', categories: ['tops', 'outerwear', 'accessories', 'auto'] },
  { customer: 'selfie', categories: ['tops', 'accessories', 'auto'] },
]

export function isCategoryAllowed(
  customer: CustomerPhotoType,
  category: 'tops' | 'bottoms' | 'one-pieces' | 'outerwear' | 'swimwear' | 'accessories' | 'auto',
): boolean {
  const row = ALLOWED_TYPE_CATEGORY_PAIRS.find((r) => r.customer === customer)
  return !!row && row.categories.includes(category)
}
