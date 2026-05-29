import 'server-only'
import { detectPosesOnImage, type PoseDetection } from './pose-detect'

/**
 * Pose consistency check — research §14 / P1.8.
 *
 * Compara 17 keypoints COCO da pessoa principal entre input e output. Se a
 * pose mudou significativamente (cliente sentado no input mas em pé no
 * output, por exemplo), a roupa não vai cair certo.
 *
 * Métrica:
 *   - Para cada keypoint visível em ambas as imagens, distância euclidiana
 *     em coords NORMALIZADAS pelo diagonal da bbox da pessoa.
 *   - Média ponderada pela visibility somada → score.
 *   - Threshold default 0.18 (≈ 18% do tamanho da pessoa — pose
 *     significativamente diferente).
 *
 * Não bloqueia geração. Vira input do retry (P1.7) — junto com identity,
 * texto e cor, pose também pode justificar retry com prompt reforçado.
 */

const DEFAULT_DISTANCE_THRESHOLD = 0.18
const KEYPOINT_VISIBILITY_MIN = 0.4

function primaryPose(poses: PoseDetection[]): PoseDetection | null {
  if (poses.length === 0) return null
  return [...poses].sort((a, b) => b.confidence - a.confidence)[0]!
}

function bboxDiagonal(bbox: [number, number, number, number]): number {
  const w = bbox[2] - bbox[0]
  const h = bbox[3] - bbox[1]
  return Math.hypot(w, h)
}

export interface PoseConsistencyComparison {
  pass: boolean
  /** Distância média normalizada (0 = idêntica, 1 = pose completamente diferente). */
  meanNormalizedDistance: number
  /** Keypoints visíveis em ambas as imagens (denominator do score). */
  comparedKeypoints: number
}

export function comparePoses(
  inputPose: PoseDetection,
  outputPose: PoseDetection,
  threshold = DEFAULT_DISTANCE_THRESHOLD,
): PoseConsistencyComparison {
  const inputDiag = bboxDiagonal(inputPose.bbox)
  const outputDiag = bboxDiagonal(outputPose.bbox)
  // Normaliza no diagonal MÉDIO pra não inflar/encolher a métrica quando o
  // modelo cropou diferente.
  const normalizer = (inputDiag + outputDiag) / 2
  if (normalizer === 0) {
    return { pass: true, meanNormalizedDistance: 0, comparedKeypoints: 0 }
  }

  let totalWeight = 0
  let weightedSum = 0
  let compared = 0
  for (let k = 0; k < 17; k += 1) {
    const a = inputPose.keypoints[k]
    const b = outputPose.keypoints[k]
    if (!a || !b) continue
    if (a.vis < KEYPOINT_VISIBILITY_MIN || b.vis < KEYPOINT_VISIBILITY_MIN) continue
    const dist = Math.hypot(a.x - b.x, a.y - b.y)
    const weight = (a.vis + b.vis) / 2
    weightedSum += (dist / normalizer) * weight
    totalWeight += weight
    compared += 1
  }
  if (totalWeight === 0) {
    return { pass: true, meanNormalizedDistance: 0, comparedKeypoints: 0 }
  }
  const meanNormalizedDistance = weightedSum / totalWeight
  return {
    pass: meanNormalizedDistance <= threshold,
    meanNormalizedDistance,
    comparedKeypoints: compared,
  }
}

export interface PoseConsistencyResult {
  pass: boolean
  method: 'yolov8n_pose_compare' | 'unavailable'
  reason?: string
  meanNormalizedDistance?: number
  comparedKeypoints?: number
}

export async function checkPoseConsistency(
  customerBuffer: Buffer,
  resultBuffer: Buffer,
): Promise<PoseConsistencyResult> {
  try {
    const [inputPoses, outputPoses] = await Promise.all([
      detectPosesOnImage(customerBuffer),
      detectPosesOnImage(resultBuffer),
    ])
    if (!inputPoses || !outputPoses) {
      return { pass: true, method: 'unavailable', reason: 'model_not_loaded' }
    }
    const input = primaryPose(inputPoses)
    const output = primaryPose(outputPoses)
    if (!input || !output) {
      return {
        pass: true,
        method: 'unavailable',
        reason: 'no_primary_pose',
      }
    }
    const cmp = comparePoses(input, output)
    return {
      pass: cmp.pass,
      method: 'yolov8n_pose_compare',
      meanNormalizedDistance: cmp.meanNormalizedDistance,
      comparedKeypoints: cmp.comparedKeypoints,
    }
  } catch (err) {
    return {
      pass: true,
      method: 'unavailable',
      reason: err instanceof Error ? err.message : 'detection_failed',
    }
  }
}
