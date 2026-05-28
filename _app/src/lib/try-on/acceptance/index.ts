import 'server-only'
import sharp from 'sharp'
import { logger } from '@/lib/logger'
import { ACCEPTANCE_THRESHOLDS } from '../quality-gate/thresholds'
import type { SafetyRating } from '../types'
import { checkAnatomy } from './anatomy-sanity'
import { computeGarmentColorFidelity } from './color-check'
import { detectGarmentText, editDistance } from './garment-text'
import { computeIdentitySimilarity } from './identity-check'
import { countPersons } from './subject-count'

/**
 * Thresholds por método de identity check. ArcFace cosine usa o threshold
 * canônico do research (0.55); dHash proxy usa 0.78 (calibração local).
 */
const IDENTITY_DHASH_PROXY_MIN = 0.78
const IDENTITY_DHASH_FACE_CROP_MIN = 0.7

function identityThresholdForMethod(method: string): number {
  if (method === 'arcface_cosine') return ACCEPTANCE_THRESHOLDS.identitySimilarityMin
  if (method === 'dhash_face_crop') return IDENTITY_DHASH_FACE_CROP_MIN
  return IDENTITY_DHASH_PROXY_MIN
}

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
  /** True iff o caller deveria tentar uma re-geração com prompt reforçado. */
  shouldRetry: boolean
  /** Cláusulas de reforço a anexar ao prompt do retry. */
  retryHints: string[]
  checks: AcceptanceCheck[]
}

export interface AcceptanceInput {
  /** Bytes of the original customer photo (post-quality-gate). */
  customerImageBuffer: Buffer
  /** Bytes of the original garment photo. */
  garmentImageBuffer: Buffer
  /** Bytes of the generated try-on result. */
  resultImageBuffer: Buffer
  /** OCR text of the garment input. Quando provido (e.g. cache do best-of-N),
   *  pula a chamada de OCR no input. */
  garmentOcrText?: string
  /** Safety ratings devolvidos pelo provider (Gemini hoje). */
  safetyRatings?: SafetyRating[]
}

export async function runAcceptanceChecks(
  input: AcceptanceInput,
): Promise<AcceptanceResult> {
  const checks: AcceptanceCheck[] = []

  checks.push(await minResolution(input))
  checks.push(await resultSharpness(input))
  checks.push(await subjectCount(input))
  checks.push(await anatomySanity(input))
  checks.push(await identitySimilarity(input))
  checks.push(await garmentColorFidelity(input))
  checks.push(await garmentTextFidelity(input))
  checks.push(await nsfwClean(input))

  const failed = checks.filter((c) => c.checked && !c.pass)
  const pass = failed.length === 0

  // Retry hints — research §14 / P1.7. Apenas as falhas onde um prompt
  // reforçado tem chance real de melhorar (cor, texto, identidade);
  // anatomy/subject/sharpness são falhas do modelo, não do prompt.
  const failedNames = new Set(failed.map((c) => c.name))
  const retryHints: string[] = []
  if (failedNames.has('garmentColorFidelity')) {
    retryHints.push(
      'STRICT: preserve the EXACT garment color from the product reference image. Match hue, saturation and value precisely.',
    )
  }
  if (failedNames.has('garmentTextFidelity')) {
    retryHints.push(
      'STRICT: preserve the EXACT text, letters, and logo on the garment from the product reference image. Spelling, casing, and font weight must match.',
    )
  }
  if (failedNames.has('identitySimilarity')) {
    retryHints.push(
      'STRICT: preserve the customer face from the customer photo. Do NOT change facial features, hair, or skin tone.',
    )
  }
  const shouldRetry = retryHints.length > 0

  return { pass, shouldRetry, retryHints, checks }
}

export function composeRetryPrompt(originalPrompt: string, retryHints: string[]): string {
  if (retryHints.length === 0) return originalPrompt
  return `${originalPrompt}\n\n--- RETRY REINFORCEMENT ---\n${retryHints.join('\n')}`
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

/**
 * Detecta gerações colapsadas (completamente borradas ou cor única).
 *
 * Usa variância da Laplaciana (mesmo algoritmo do client-side em
 * client-signals.ts) no resultado. Threshold muito conservador: só
 * rejeita imagens verdadeiramente sem textura, onde o modelo gerou
 * uma borrão ou cor sólida. Não é um substituto pra detecção de anatomia.
 */
async function resultSharpness(input: AcceptanceInput): Promise<AcceptanceCheck> {
  try {
    const meta = await sharp(input.resultImageBuffer).metadata()
    const W = meta.width ?? 0
    const H = meta.height ?? 0
    if (W === 0 || H === 0) return { name: 'resultSharpness', pass: true, checked: false }

    const shortSide = Math.min(W, H)
    const scale = shortSide > 1024 ? 1024 / shortSide : 1
    const sW = Math.max(1, Math.round(W * scale))
    const sH = Math.max(1, Math.round(H * scale))

    const { data } = await sharp(input.resultImageBuffer)
      .resize(sW, sH, { fit: 'cover', kernel: 'lanczos3' })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true })

    // Variância da Laplaciana 3×3: mesmo kernel do client-side.
    let lapSum = 0
    let lapSumSq = 0
    let count = 0
    for (let y = 1; y < sH - 1; y++) {
      for (let x = 1; x < sW - 1; x++) {
        const idx = y * sW + x
        const v =
          -4 * (data[idx] ?? 0) +
          (data[idx - 1] ?? 0) +
          (data[idx + 1] ?? 0) +
          (data[idx - sW] ?? 0) +
          (data[idx + sW] ?? 0)
        lapSum += v
        lapSumSq += v * v
        count += 1
      }
    }
    const mean = lapSum / count
    const variance = lapSumSq / count - mean * mean

    // Threshold conservador: só rejeita gerações verdadeiramente colapsadas.
    // Fotos reais: 100–500+. Boas gerações de IA: 60–300+. Colapso: < 25.
    const COLLAPSE_THRESHOLD = 25
    return {
      name: 'resultSharpness',
      pass: variance >= COLLAPSE_THRESHOLD,
      checked: true,
      details: {
        variance: Math.round(variance),
        threshold: COLLAPSE_THRESHOLD,
        widthPx: sW,
        heightPx: sH,
      },
    }
  } catch (err) {
    logger.warn('Acceptance: resultSharpness falhou', {
      message: err instanceof Error ? err.message : String(err),
    })
    return { name: 'resultSharpness', pass: true, checked: false }
  }
}

async function subjectCount(input: AcceptanceInput): Promise<AcceptanceCheck> {
  try {
    const res = await countPersons(input.resultImageBuffer)
    if (res.method === 'unavailable') {
      return {
        name: 'subjectCount',
        pass: true,
        checked: false,
        details: { reason: res.reason ?? 'unavailable' },
      }
    }
    // Caminho feliz: exatamente 1 pessoa. 0 também é falha (modelo gerou
    // cenário sem corpo) mas tratamos com mesmo verdict.
    return {
      name: 'subjectCount',
      pass: res.count === 1,
      checked: true,
      details: {
        count: res.count,
        confidences: res.confidences,
        method: res.method,
      },
    }
  } catch (err) {
    logger.warn('Acceptance: subjectCount falhou', {
      message: err instanceof Error ? err.message : String(err),
    })
    return {
      name: 'subjectCount',
      pass: true, // erro de medição não bloqueia
      checked: false,
      details: { error: 'detection_failed' },
    }
  }
}

async function anatomySanity(input: AcceptanceInput): Promise<AcceptanceCheck> {
  try {
    const res = await checkAnatomy(input.customerImageBuffer, input.resultImageBuffer)
    if (res.method === 'unavailable') {
      return {
        name: 'anatomySanity',
        pass: true,
        checked: false,
        details: { reason: res.reason ?? 'unavailable' },
      }
    }
    return {
      name: 'anatomySanity',
      pass: res.pass,
      checked: true,
      details: {
        method: res.method,
        input: res.input,
        output: res.output,
        flags: res.flags,
      },
    }
  } catch (err) {
    logger.warn('Acceptance: anatomySanity falhou', {
      message: err instanceof Error ? err.message : String(err),
    })
    return {
      name: 'anatomySanity',
      pass: true,
      checked: false,
      details: { error: 'detection_failed' },
    }
  }
}

async function identitySimilarity(input: AcceptanceInput): Promise<AcceptanceCheck> {
  try {
    const sim = await computeIdentitySimilarity(
      input.customerImageBuffer,
      input.resultImageBuffer,
    )
    const threshold = identityThresholdForMethod(sim.method)
    return {
      name: 'identitySimilarity',
      pass: sim.similarity >= threshold,
      checked: true,
      details: {
        similarity: Number(sim.similarity.toFixed(4)),
        hammingDistance: sim.hammingDistance,
        embeddingDim: sim.embeddingDim,
        method: sim.method,
        faceCroppedByPose: sim.faceCroppedByPose,
        threshold,
        // Mantemos o threshold canônico no log pra dashboards de migração.
        canonicalThreshold: ACCEPTANCE_THRESHOLDS.identitySimilarityMin,
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

async function garmentTextFidelity(input: AcceptanceInput): Promise<AcceptanceCheck> {
  try {
    // 1. Detecta texto na peça (reuso de cache do best-of-N quando passado)
    let garmentText = input.garmentOcrText
    if (garmentText === undefined) {
      if (input.garmentImageBuffer.byteLength === 0) {
        return {
          name: 'garmentTextFidelity',
          pass: true,
          checked: false,
          details: { reason: 'no_garment_buffer' },
        }
      }
      const g = await detectGarmentText(input.garmentImageBuffer)
      if (g.source === 'unavailable') {
        return {
          name: 'garmentTextFidelity',
          pass: true,
          checked: false,
          details: { reason: g.detail ?? 'ocr_unavailable' },
        }
      }
      garmentText = g.text
    }

    // 2. Sem texto na peça: skip
    if (!garmentText.trim()) {
      return {
        name: 'garmentTextFidelity',
        pass: true,
        checked: false,
        details: { reason: 'no_text_on_garment' },
      }
    }

    // 3. OCR no resultado e compara
    const r = await detectGarmentText(input.resultImageBuffer)
    if (r.source === 'unavailable') {
      return {
        name: 'garmentTextFidelity',
        pass: true,
        checked: false,
        details: { reason: r.detail ?? 'result_ocr_unavailable' },
      }
    }
    const distance = editDistance(garmentText, r.text)
    const maxDist = ACCEPTANCE_THRESHOLDS.ocrEditDistanceMax
    return {
      name: 'garmentTextFidelity',
      pass: distance <= maxDist,
      checked: true,
      details: {
        garmentText: garmentText.slice(0, 80),
        resultText: r.text.slice(0, 80),
        editDistance: distance,
        maxEditDistance: maxDist,
      },
    }
  } catch (err) {
    logger.warn('Acceptance: garmentTextFidelity falhou', {
      message: err instanceof Error ? err.message : String(err),
    })
    return {
      name: 'garmentTextFidelity',
      pass: true,
      checked: false,
      details: { error: 'ocr_failed' },
    }
  }
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
