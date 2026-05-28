import 'server-only'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'
import * as ort from 'onnxruntime-node'

/**
 * Anatomy sanity — research deliverable §14 / cenários §2.4.
 *
 * Detecta dois modos de falha clássicos do diffusion model:
 *   1. Membros desaparecidos: input tem 2 punhos visíveis e o resultado tem 1
 *      (modelo "comeu" um braço).
 *   2. Anatomia extra: resultado tem mais pessoas/membros que o input
 *      (modelo gerou braço sobrando ou colagem).
 *
 * Roda YOLOv8n-pose (mesmo runtime onnxruntime-node do subject-count) que
 * devolve 17 keypoints COCO por pessoa detectada. Comparamos input vs output
 * por contagem de keypoints "visíveis" nos limbs principais.
 *
 * Por que não MediaPipe Pose + Hand:
 *   - MediaPipe Tasks Vision é WASM/browser-first; rodar no Node exige
 *     `node-canvas` (dep nativa pesada) + polyfills frágeis.
 *   - YOLOv8-pose ONNX reusa a mesma runtime do subject-count: zero infra
 *     adicional além do modelo .onnx.
 *   - Hand-finger count detalhado (e.g. dedos extras) fica fora deste check;
 *     a heurística aqui captura "braços a mais" via wrists, não dedos.
 */

const DEFAULT_MODEL_PATH = resolve(process.cwd(), 'models', 'yolov8n-pose.onnx')
const INPUT_SIZE = 640
const PERSON_CONFIDENCE_MIN = 0.5
const KEYPOINT_VISIBILITY_MIN = 0.5
const POSE_NMS_IOU_THRESHOLD = 0.5

function resolveModelPath(): string {
  return process.env.YOLOV8N_POSE_ONNX_PATH ?? DEFAULT_MODEL_PATH
}

let cachedSession: Promise<ort.InferenceSession | null> | null = null

function loadSession(): Promise<ort.InferenceSession | null> {
  if (cachedSession) return cachedSession
  cachedSession = (async () => {
    const path = resolveModelPath()
    if (!existsSync(path)) return null
    try {
      return await ort.InferenceSession.create(path, {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'all',
      })
    } catch {
      return null
    }
  })()
  return cachedSession
}

export function __resetAnatomyCacheForTests(): void {
  cachedSession = null
}

export function __setAnatomySessionForTests(
  session: ort.InferenceSession | null,
): void {
  cachedSession = Promise.resolve(session)
}

/** Índices COCO dos limbs que monitoramos (wrists + ankles). */
const LIMB_KEYPOINTS = {
  leftWrist: 9,
  rightWrist: 10,
  leftAnkle: 15,
  rightAnkle: 16,
} as const

interface PreprocessedImage {
  tensor: ort.Tensor
  scale: number
  padX: number
  padY: number
}

async function preprocess(buffer: Buffer): Promise<PreprocessedImage> {
  const meta = await sharp(buffer).metadata()
  const origW = meta.width ?? 0
  const origH = meta.height ?? 0
  if (origW === 0 || origH === 0) {
    throw new Error('anatomy-sanity: imagem sem dimensões')
  }
  const scale = Math.min(INPUT_SIZE / origW, INPUT_SIZE / origH)
  const newW = Math.round(origW * scale)
  const newH = Math.round(origH * scale)
  const padX = Math.floor((INPUT_SIZE - newW) / 2)
  const padY = Math.floor((INPUT_SIZE - newH) / 2)

  const resized = await sharp(buffer)
    .resize(newW, newH, { fit: 'fill', kernel: 'lanczos3' })
    .extend({
      top: padY,
      bottom: INPUT_SIZE - newH - padY,
      left: padX,
      right: INPUT_SIZE - newW - padX,
      background: { r: 114, g: 114, b: 114 },
    })
    .removeAlpha()
    .raw()
    .toBuffer()

  const pixelCount = INPUT_SIZE * INPUT_SIZE
  const data = new Float32Array(3 * pixelCount)
  for (let i = 0; i < pixelCount; i += 1) {
    const r = resized[i * 3] ?? 0
    const g = resized[i * 3 + 1] ?? 0
    const b = resized[i * 3 + 2] ?? 0
    data[i] = r / 255
    data[i + pixelCount] = g / 255
    data[i + 2 * pixelCount] = b / 255
  }
  return {
    tensor: new ort.Tensor('float32', data, [1, 3, INPUT_SIZE, INPUT_SIZE]),
    scale,
    padX,
    padY,
  }
}

export interface PoseDetection {
  bbox: [number, number, number, number]
  confidence: number
  /** 17 keypoints, cada um com (x, y, vis) em coords da imagem de entrada do modelo. */
  keypoints: { x: number; y: number; vis: number }[]
}

/**
 * Parse do output cru do YOLOv8-pose ([1, 56, N]).
 * Layout por anchor:
 *   [0..3]: xc, yc, w, h (bbox)
 *   [4]:    person confidence
 *   [5..55]: 17 keypoints como (x, y, vis), achatado.
 */
export function parsePoseDetections(
  output: Float32Array,
  numAnchors: number,
  minConfidence = PERSON_CONFIDENCE_MIN,
): PoseDetection[] {
  const detections: PoseDetection[] = []
  for (let a = 0; a < numAnchors; a += 1) {
    const conf = output[4 * numAnchors + a] ?? 0
    if (conf < minConfidence) continue
    const xc = output[0 * numAnchors + a] ?? 0
    const yc = output[1 * numAnchors + a] ?? 0
    const w = output[2 * numAnchors + a] ?? 0
    const h = output[3 * numAnchors + a] ?? 0
    const keypoints: PoseDetection['keypoints'] = []
    for (let k = 0; k < 17; k += 1) {
      const base = (5 + k * 3) * numAnchors + a
      keypoints.push({
        x: output[base] ?? 0,
        y: output[base + numAnchors] ?? 0,
        vis: output[base + 2 * numAnchors] ?? 0,
      })
    }
    detections.push({
      bbox: [xc - w / 2, yc - h / 2, xc + w / 2, yc + h / 2],
      confidence: conf,
      keypoints,
    })
  }
  return detections
}

function iouBox(
  a: [number, number, number, number],
  b: [number, number, number, number],
): number {
  const ix1 = Math.max(a[0], b[0])
  const iy1 = Math.max(a[1], b[1])
  const ix2 = Math.min(a[2], b[2])
  const iy2 = Math.min(a[3], b[3])
  const iw = Math.max(0, ix2 - ix1)
  const ih = Math.max(0, iy2 - iy1)
  const inter = iw * ih
  if (inter === 0) return 0
  const aArea = (a[2] - a[0]) * (a[3] - a[1])
  const bArea = (b[2] - b[0]) * (b[3] - b[1])
  const union = aArea + bArea - inter
  return union > 0 ? inter / union : 0
}

export function nmsPoses(
  detections: PoseDetection[],
  iouThreshold = POSE_NMS_IOU_THRESHOLD,
): PoseDetection[] {
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence)
  const kept: PoseDetection[] = []
  for (const det of sorted) {
    let suppressed = false
    for (const k of kept) {
      if (iouBox(det.bbox, k.bbox) > iouThreshold) {
        suppressed = true
        break
      }
    }
    if (!suppressed) kept.push(det)
  }
  return kept
}

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

async function detectPoses(buffer: Buffer): Promise<PoseDetection[] | null> {
  const session = await loadSession()
  if (!session) return null
  const pre = await preprocess(buffer)
  const inputName = session.inputNames[0] ?? 'images'
  const out = await session.run({ [inputName]: pre.tensor })
  const outputName = session.outputNames[0] ?? 'output0'
  const tensor = out[outputName]
  if (!tensor) return null
  const data = tensor.data as Float32Array
  const dims = tensor.dims
  if (dims.length !== 3 || dims[0] !== 1 || dims[1] !== 56) return null
  const numAnchors = dims[2]!
  const raw = parsePoseDetections(data, numAnchors)
  return nmsPoses(raw)
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
 * Regras (fail-safe — qualquer ausência de medição → checked:false):
 *   - personCount(output) > personCount(input) + 0  → flag 'extra_person'
 *   - visibleWrists(output)  > visibleWrists(input)  → flag 'extra_arms'
 *   - visibleAnkles(output)  > visibleAnkles(input)  → flag 'extra_legs'
 *
 * Qualquer flag = fail. O loop de retry (P1) usa essas flags pra ajustar prompt.
 */
export async function checkAnatomy(
  customerBuffer: Buffer,
  resultBuffer: Buffer,
): Promise<AnatomySanityResult> {
  try {
    const [inputPoses, outputPoses] = await Promise.all([
      detectPoses(customerBuffer),
      detectPoses(resultBuffer),
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
