import 'server-only'
import { detectPosesOnImage, type PoseDetection } from './pose-detect'

/**
 * Anatomy sanity — research deliverable §14 / cenários §2.4.
 *
 * Detecta dois modos de falha clássicos do diffusion model:
 *   1. Membros desaparecidos: input tem 2 punhos visíveis e o resultado tem 1
 *      (modelo "comeu" um braço).
 *   2. Anatomia extra: resultado tem mais pessoas/membros que o input
 *      (modelo gerou braço sobrando ou colagem).
 *
 * Roda YOLOv8n-pose via `pose-detect.ts` (compartilhado com face-region/etc).
 * Devolve 17 keypoints COCO por pessoa detectada. Comparamos input vs output
 * por contagem de keypoints "visíveis" nos limbs principais.
 *
 * Por que não MediaPipe Pose + Hand:
 *   - MediaPipe Tasks Vision é WASM/browser-first; rodar no Node exige
 *     `node-canvas` (dep nativa pesada) + polyfills frágeis.
 *   - YOLOv8-pose ONNX reusa a runtime do subject-count: zero infra extra.
 *   - Trade-off: não detectamos dedos extras (só braços/pernas via wrists/ankles).
 */

const KEYPOINT_VISIBILITY_MIN = 0.5

/** Índices COCO dos limbs que monitoramos. */
const LIMB_KEYPOINTS = {
  leftWrist: 9,
  rightWrist: 10,
  leftAnkle: 15,
  rightAnkle: 16,
} as const

export interface AnatomyTotals {
  /** Pessoas detectadas com confidence acima do mínimo. */
  personCount: number
  /** Punhos visíveis somados ao longo de todas as pessoas. */
  visibleWrists: number
  /** Tornozelos visíveis somados ao longo de todas as pessoas. */
  visibleAnkles: number
}

export function aggregateLimbs(poses: PoseDetection[]): AnatomyTotals {
  let visibleWrists = 0
  let visibleAnkles = 0
  for (const p of poses) {
    if ((p.keypoints[LIMB_KEYPOINTS.leftWrist]?.vis ?? 0) >= KEYPOINT_VISIBILITY_MIN) {
      visibleWrists += 1
    }
    if ((p.keypoints[LIMB_KEYPOINTS.rightWrist]?.vis ?? 0) >= KEYPOINT_VISIBILITY_MIN) {
      visibleWrists += 1
    }
    if ((p.keypoints[LIMB_KEYPOINTS.leftAnkle]?.vis ?? 0) >= KEYPOINT_VISIBILITY_MIN) {
      visibleAnkles += 1
    }
    if ((p.keypoints[LIMB_KEYPOINTS.rightAnkle]?.vis ?? 0) >= KEYPOINT_VISIBILITY_MIN) {
      visibleAnkles += 1
    }
  }
  return { personCount: poses.length, visibleWrists, visibleAnkles }
}

export interface AnatomySanityResult {
  pass: boolean
  method: 'yolov8n_pose' | 'unavailable'
  reason?: string
  input?: AnatomyTotals
  output?: AnatomyTotals
  flags?: string[]
}

/**
 * Compara contagem de limbs/pessoas entre customer (input) e result (output).
 *
 * Regras:
 *   - personCount(output) > personCount(input)   → flag 'extra_person'
 *   - visibleWrists(output)  > visibleWrists(input)  → flag 'extra_arms'
 *   - visibleAnkles(output)  > visibleAnkles(input)  → flag 'extra_legs'
 */
export async function checkAnatomy(
  customerBuffer: Buffer,
  resultBuffer: Buffer,
): Promise<AnatomySanityResult> {
  try {
    const [inputPoses, outputPoses] = await Promise.all([
      detectPosesOnImage(customerBuffer),
      detectPosesOnImage(resultBuffer),
    ])
    if (!inputPoses || !outputPoses) {
      return {
        pass: true,
        method: 'unavailable',
        reason: 'model_not_loaded_or_invalid_output',
      }
    }
    const input = aggregateLimbs(inputPoses)
    const output = aggregateLimbs(outputPoses)
    const flags: string[] = []
    if (output.personCount > input.personCount) flags.push('extra_person')
    if (output.visibleWrists > input.visibleWrists) flags.push('extra_arms')
    if (output.visibleAnkles > input.visibleAnkles) flags.push('extra_legs')
    return {
      pass: flags.length === 0,
      method: 'yolov8n_pose',
      input,
      output,
      flags,
    }
  } catch (err) {
    return {
      pass: true,
      method: 'unavailable',
      reason: err instanceof Error ? err.message : 'detection_failed',
    }
  }
}

// Re-exports pra continuidade do test surface após o refactor
export {
  __resetPoseCacheForTests as __resetAnatomyCacheForTests,
  __setPoseSessionForTests as __setAnatomySessionForTests,
  nmsPoses,
  parsePoseDetections,
  type PoseDetection,
} from './pose-detect'
