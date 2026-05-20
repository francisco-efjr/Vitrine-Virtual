import 'server-only'
import { CUSTOMER_PHOTO_THRESHOLDS, GARMENT_PHOTO_THRESHOLDS } from './thresholds'
import { REJECTION_MESSAGES, type RejectionReason, type RejectionMessage } from './rejection-messages'
import {
  isCategoryAllowed,
  type CustomerPhotoSignals,
  type CustomerPhotoType,
  type GarmentPhotoSignals,
  type GateResult,
  type GateVerdict,
} from './types'

export {
  REJECTION_MESSAGES,
  CUSTOMER_PHOTO_THRESHOLDS,
  GARMENT_PHOTO_THRESHOLDS,
}
export type {
  CustomerPhotoSignals,
  CustomerPhotoType,
  GarmentPhotoSignals,
  GateResult,
  GateVerdict,
  RejectionMessage,
  RejectionReason,
}

/**
 * Pure decision function — given pre-computed signals, decide a verdict.
 *
 * SEPARATION OF CONCERNS
 * ----------------------
 * This module does NOT compute the signals itself. The actual measurement
 * code (decode, Laplacian variance, MediaPipe pose, face detection) lives:
 *   - In the BROWSER, on upload (preferred — instant UX, zero server cost).
 *   - And as a server-side double-check before paid generation.
 *
 * The dev should wire `@mediapipe/tasks-vision` on the client and post the
 * resulting CustomerPhotoSignals back to the server for verification.
 *
 * See `_app/src/lib/try-on/tiers/README.md` for the wiring checklist.
 */

export function evaluateCustomerPhoto(
  signals: CustomerPhotoSignals,
  ctx: { garmentCategory: 'tops' | 'bottoms' | 'one-pieces' | 'outerwear' | 'swimwear' | 'accessories' | 'auto' },
): GateResult {
  const t = CUSTOMER_PHOTO_THRESHOLDS
  const warnings: RejectionReason[] = []

  // 1) Hard rejects first
  if (signals.shortestSidePx < t.minShortestSidePx) {
    return rejected('low_resolution', signals)
  }
  if (signals.sharpness < t.sharpness.reject) {
    return rejected('too_blurry', signals)
  }
  if (
    signals.meanLuminance < t.luminance.hardReject.lo ||
    signals.meanLuminance > t.luminance.hardReject.hi
  ) {
    return rejected('bad_lighting', signals)
  }
  if (signals.personCount === 0) {
    return rejected('no_person', signals)
  }
  if (signals.personCount > 1) {
    return rejected('multiple_people', signals)
  }
  if (!signals.faceVisible) {
    return rejected('no_face', signals)
  }
  if (signals.targetRegionUnoccluded < t.targetRegionOcclusion.reject) {
    return rejected('target_region_occluded', signals)
  }
  // Category/photo-type compatibility (e.g. selfie + bottoms)
  if (!isCategoryAllowed(signals.detectedType, ctx.garmentCategory)) {
    if (signals.detectedType === 'selfie' && (ctx.garmentCategory === 'bottoms' || ctx.garmentCategory === 'one-pieces')) {
      return rejected('selfie_for_bottom', signals)
    }
    if (signals.detectedType === 'partial' && ctx.garmentCategory === 'bottoms') {
      return rejected('partial_body', signals)
    }
    if (signals.detectedType === 'selfie') {
      return rejected('selfie_for_top_cropped', signals)
    }
    return rejected('partial_body', signals)
  }

  // 2) Soft warnings
  let needsWarn = false

  if (signals.sharpness < t.sharpness.warn) {
    warnings.push('too_blurry')
    needsWarn = true
  }
  if (
    signals.meanLuminance < t.luminance.warn.lo ||
    signals.meanLuminance > t.luminance.warn.hi
  ) {
    warnings.push('bad_lighting')
    needsWarn = true
  }
  if (signals.faceAreaFraction < t.faceMinAreaFraction) {
    warnings.push('no_face')
    needsWarn = true
  }
  if (!signals.fullBodyLandmarksOk && signals.detectedType === 'full_body') {
    // Treat a self-declared full-body that lacks landmarks as partial.
    warnings.push('partial_body')
    needsWarn = true
  }
  if (!signals.poseUpright) {
    warnings.push('pose_mismatch')
    needsWarn = true
  }
  if (signals.targetRegionUnoccluded < t.targetRegionOcclusion.warn) {
    warnings.push('target_region_occluded')
    needsWarn = true
  }

  return {
    verdict: needsWarn ? 'proceed_with_warning' : 'proceed',
    reason: needsWarn ? 'uncertain' : undefined,
    signals,
    warnings,
  }
}

export function evaluateGarmentPhoto(signals: GarmentPhotoSignals): GateResult {
  const t = GARMENT_PHOTO_THRESHOLDS
  const warnings: RejectionReason[] = []

  if (signals.shortestSidePx < t.minShortestSidePx) {
    return {
      verdict: 'reject',
      reason: 'low_resolution',
      signals,
      warnings,
    }
  }
  if (signals.detectionConfidence < t.detectionMinConfidence) {
    return {
      verdict: 'reject',
      reason: 'garment_unclear',
      signals,
      warnings,
    }
  }
  if (signals.garmentAreaFraction < t.garmentMinAreaFractionWarn) {
    warnings.push('garment_unclear')
  }

  return {
    verdict: warnings.length > 0 ? 'proceed_with_warning' : 'proceed',
    signals,
    warnings,
  }
}

function rejected(
  reason: RejectionReason,
  signals: CustomerPhotoSignals | GarmentPhotoSignals,
): GateResult {
  return { verdict: 'reject', reason, signals, warnings: [] }
}

/**
 * Convenience: combine the two evaluations into a single pipeline decision.
 * If either side is `reject`, the whole gate rejects with the customer-side
 * reason taking precedence (because the customer can act on it more easily).
 */
export function combineGateResults(
  customer: GateResult,
  garment: GateResult,
): GateResult {
  if (customer.verdict === 'reject') return customer
  if (garment.verdict === 'reject') return garment
  if (
    customer.verdict === 'proceed_with_warning' ||
    garment.verdict === 'proceed_with_warning'
  ) {
    return {
      verdict: 'proceed_with_warning',
      reason: 'uncertain',
      signals: customer.signals,
      warnings: [...customer.warnings, ...garment.warnings],
    }
  }
  return customer
}
