import 'server-only'
import sharp from 'sharp'
import { logger } from '@/lib/logger'
import { ACCEPTANCE_THRESHOLDS } from '../quality-gate/thresholds'
import type { SafetyRating } from '../types'
import { computeGarmentColorFidelity } from './color-check'
import { computeIdentitySimilarity } from './identity-check'

/**
 * Threshold do dHash proxy. Diferente do `identitySimilarityMin` (0.55) que
 * o research projetou pra ArcFace cosine. Quando a checagem ArcFace real
 * for implementada (TODO em identity-check.ts), removemos este e voltamos
 * pro threshold canônico.
 */
const IDENTITY_DHASH_PROXY_MIN = 0.78

/**
 * Generation acceptance checks — research deliverable section 14.
 *
 * STATUS: SCAFFOLDED, NOT FULLY IMPLEMENTED.
 *
 * What's here today:
 *   - Stable types and thresholds.
 *   - A single entry point `runAcceptanceChecks` that runs every check.
 *   - Each individual check is a STUB that returns `pass: true` for now —
 *     the dev should swap each stub for a real implementation as time
 *     allows. The order matters: cheaper checks first so we can short-circuit.
 *
 * Why these stubs ship in "pass" mode:
 *   - The product is shipping Gemini-only. Without paid models like FASHN
 *     we cannot run a retry loop that costs more than the original
 *     generation, so the most useful first move is logging, not blocking.
 *   - Until the checks are real, every "pass" is logged with a `checked=false`
 *     flag so dashboards do not over-report quality.
 *
 * What each check should do when implemented:
 *
 *   identitySimilarity()
 *     - Compute a face embedding for the original customer photo and for
 *       the generated image. Compare cosine similarity.
 *     - Suggested model: a small ArcFace ONNX (CPU-friendly) — under 50 MB.
 *     - Threshold: ACCEPTANCE_THRESHOLDS.identitySimilarityMin (default 0.55).
 *
 *   anatomySanity()
 *     - Run MediaPipe Pose + Hands on the generated image.
 *     - Reject if more than 2 detected hands (allow occlusion: 2 ± 1).
 *     - Reject if a detected limb count exceeds the customer photo's.
 *
 *   garmentColorFidelity()
 *     - Sample a central patch of the garment in source and output.
 *     - Convert both to Lab and compute ΔE2000.
 *     - Threshold: ACCEPTANCE_THRESHOLDS.garmentColorMaxDeltaE.
 *
 *   garmentTextFidelity()
 *     - OCR both the garment input and the output in the garment region.
 *     - Compare with case-insensitive edit distance.
 *
 *   subjectCount()
 *     - Person detection must return exactly 1.
 *
 *   minResolution()
 *     - Output shortest side >= ACCEPTANCE_THRESHOLDS.minOutputShortestSidePx.
 *
 *   nsfwClean()
 *     - Run a small NSFW classifier. The Gemini API returns safety ratings
 *       inline, so prefer those when available.
 */

export interface AcceptanceCheck {
  name: string
  pass: boolean
  /** True when the check actually ran. False = stub / not implemented. */
  checked: boolean
  /** Free-form details for the log. */
  details?: Record<string, unknown>
}

export interface AcceptanceResult {
  pass: boolean
  /** True iff the result MUST be retried before showing the customer. */
  shouldRetry: boolean
  checks: AcceptanceCheck[]
}

export interface AcceptanceInput {
  /** Bytes of the original customer photo (post-quality-gate). */
  customerImageBuffer: Buffer
  /** Bytes of the original garment photo. */
  garmentImageBuffer: Buffer
  /** Bytes of the generated try-on result. */
  resultImageBuffer: Buffer
  /** Optional text that was OCR'd on the garment input (from the gate). */
  garmentOcrText?: string
  /** Safety ratings devolvidos pelo provider (Gemini hoje). */
  safetyRatings?: SafetyRating[]
}

export async function runAcceptanceChecks(
  input: AcceptanceInput,
): Promise<AcceptanceResult> {
  const checks: AcceptanceCheck[] = []

  checks.push(await minResolution(input))
  checks.push(await subjectCount(input))
  checks.push(await anatomySanity(input))
  checks.push(await identitySimilarity(input))
  checks.push(await garmentColorFidelity(input))
  checks.push(await garmentTextFidelity(input))
  checks.push(await nsfwClean(input))

  const failed = checks.filter((c) => c.checked && !c.pass)
  const pass = failed.length === 0
  // Today: never auto-retry because we'd burn a second paid generation.
  // When Tier A is wired, set `shouldRetry = true` for identity/color/text
  // failures (those benefit from a retry with adjusted prompt).
  const shouldRetry = false

  return { pass, shouldRetry, checks }
}

// ─── Stubs ───────────────────────────────────────────────────────────────

async function minResolution(input: AcceptanceInput): Promise<AcceptanceCheck> {
  try {
    const meta = await sharp(input.resultImageBuffer).metadata()
    const w = meta.width ?? 0
    const h = meta.height ?? 0
    const shortestSide = Math.min(w, h)
    const threshold = ACCEPTANCE_THRESHOLDS.minOutputShortestSidePx
    return {
      name: 'minResolution',
      pass: shortestSide >= threshold,
      checked: true,
      details: { shortestSide, thresholdPx: threshold, width: w, height: h },
    }
  } catch (err) {
    logger.warn('Acceptance: minResolution falhou', {
      message: err instanceof Error ? err.message : String(err),
    })
    return {
      name: 'minResolution',
      pass: true,
      checked: false,
      details: { error: 'metadata_failed' },
    }
  }
}

async function subjectCount(_input: AcceptanceInput): Promise<AcceptanceCheck> {
  // TODO: server-side person detection (yolov8n or MediaPipe via tfjs-node).
  return { name: 'subjectCount', pass: true, checked: false }
}

async function anatomySanity(_input: AcceptanceInput): Promise<AcceptanceCheck> {
  // TODO: MediaPipe Pose + Hands. Reject extra limbs / extra hands.
  return { name: 'anatomySanity', pass: true, checked: false }
}

async function identitySimilarity(input: AcceptanceInput): Promise<AcceptanceCheck> {
  try {
    const sim = await computeIdentitySimilarity(
      input.customerImageBuffer,
      input.resultImageBuffer,
    )
    return {
      name: 'identitySimilarity',
      // dHash proxy: usa threshold local. ArcFace real virá depois (ver
      // identity-check.ts TODO).
      pass: sim.similarity >= IDENTITY_DHASH_PROXY_MIN,
      checked: true,
      details: {
        similarity: Number(sim.similarity.toFixed(4)),
        hammingDistance: sim.hammingDistance,
        method: sim.method,
        proxyThreshold: IDENTITY_DHASH_PROXY_MIN,
        // Mantemos o threshold canônico no log pra quando a substituição vier.
        targetThresholdWhenArcface: ACCEPTANCE_THRESHOLDS.identitySimilarityMin,
      },
    }
  } catch (err) {
    logger.warn('Acceptance: identitySimilarity falhou', {
      message: err instanceof Error ? err.message : String(err),
    })
    return {
      name: 'identitySimilarity',
      pass: true, // não bloqueia em erro de medição
      checked: false,
      details: { error: 'similarity_computation_failed' },
    }
  }
}

async function garmentColorFidelity(input: AcceptanceInput): Promise<AcceptanceCheck> {
  // Sem buffer da peça (use-case ainda não fetcha o garmentUrl), pulamos.
  // Quando o use-case passar o buffer, a checagem ativa automaticamente.
  if (input.garmentImageBuffer.byteLength === 0) {
    return {
      name: 'garmentColorFidelity',
      pass: true,
      checked: false,
      details: { reason: 'no_garment_buffer' },
    }
  }
  try {
    const fid = await computeGarmentColorFidelity(
      input.garmentImageBuffer,
      input.resultImageBuffer,
    )
    const maxDeltaE = ACCEPTANCE_THRESHOLDS.garmentColorMaxDeltaE
    return {
      name: 'garmentColorFidelity',
      pass: fid.deltaE <= maxDeltaE,
      checked: true,
      details: {
        deltaE: Number(fid.deltaE.toFixed(3)),
        maxDeltaE,
        method: fid.method,
        sourceLab: roundLab(fid.sourceLab),
        resultLab: roundLab(fid.resultLab),
      },
    }
  } catch (err) {
    logger.warn('Acceptance: garmentColorFidelity falhou', {
      message: err instanceof Error ? err.message : String(err),
    })
    return {
      name: 'garmentColorFidelity',
      pass: true,
      checked: false,
      details: { error: 'color_check_failed' },
    }
  }
}

function roundLab(lab: { L: number; a: number; b: number }) {
  return {
    L: Number(lab.L.toFixed(2)),
    a: Number(lab.a.toFixed(2)),
    b: Number(lab.b.toFixed(2)),
  }
}

async function garmentTextFidelity(_input: AcceptanceInput): Promise<AcceptanceCheck> {
  // TODO: lightweight OCR (tesseract.js or PaddleOCR REST), compare.
  return { name: 'garmentTextFidelity', pass: true, checked: false }
}

/**
 * Probabilidades de risco do Gemini (Google AI):
 *   NEGLIGIBLE < LOW < MEDIUM < HIGH
 * O try-on é um produto de moda: por padrão tratamos MEDIUM em categorias
 * sexuais/perigosas como FALHA (research §14). HIGH em qualquer categoria
 * sempre falha. Modos mais permissivos (research §13 safetyLevel) podem
 * relaxar para HIGH-only no futuro.
 */
const PROBABILITY_ORDER: Record<string, number> = {
  NEGLIGIBLE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
}

const STRICT_CATEGORIES = new Set([
  'HARM_CATEGORY_SEXUAL',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
  'HARM_CATEGORY_DANGEROUS',
])

async function nsfwClean(input: AcceptanceInput): Promise<AcceptanceCheck> {
  const ratings = input.safetyRatings ?? []
  if (!ratings.length) {
    return {
      name: 'nsfwClean',
      pass: true,
      checked: false,
      details: { reason: 'no_safety_ratings_from_provider' },
    }
  }

  // Qualquer flag explícita do provider domina.
  const blockedRating = ratings.find((r) => r.blocked === true)
  if (blockedRating) {
    return {
      name: 'nsfwClean',
      pass: false,
      checked: true,
      details: {
        reason: 'provider_blocked',
        category: blockedRating.category,
        probability: blockedRating.probability,
      },
    }
  }

  // Falha em HIGH em qualquer categoria, ou MEDIUM em categorias estritas.
  for (const r of ratings) {
    const level = PROBABILITY_ORDER[r.probability] ?? 0
    if (level >= PROBABILITY_ORDER.HIGH!) {
      return {
        name: 'nsfwClean',
        pass: false,
        checked: true,
        details: {
          reason: 'high_probability',
          category: r.category,
          probability: r.probability,
        },
      }
    }
    if (STRICT_CATEGORIES.has(r.category) && level >= PROBABILITY_ORDER.MEDIUM!) {
      return {
        name: 'nsfwClean',
        pass: false,
        checked: true,
        details: {
          reason: 'medium_in_strict_category',
          category: r.category,
          probability: r.probability,
        },
      }
    }
  }

  return {
    name: 'nsfwClean',
    pass: true,
    checked: true,
    details: {
      ratings: ratings.map((r) => ({ category: r.category, probability: r.probability })),
    },
  }
}
