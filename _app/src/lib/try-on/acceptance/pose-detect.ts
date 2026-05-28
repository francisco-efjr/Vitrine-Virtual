import 'server-only'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'
import * as ort from 'onnxruntime-node'

/**
 * Wrapper compartilhado do YOLOv8n-pose. Usado por:
 *   - acceptance/anatomy-sanity.ts (contagem de limbs)
 *   - acceptance/face-region.ts    (bbox da face via keypoints)
 *   - (futuro) pose-consistency    (P1.8)
 *
 * Devolve detecções em coords da IMAGEM ORIGINAL (já desfaz letterbox).
 */

const DEFAULT_MODEL_PATH = resolve(process.cwd(), 'models', 'yolov8n-pose.onnx')
const INPUT_SIZE = 640
const PERSON_CONFIDENCE_MIN = 0.5
const POSE_NMS_IOU_THRESHOLD = 0.5

function resolveModelPath(): string {
  return process.env.YOLOV8N_POSE_ONNX_PATH ?? DEFAULT_MODEL_PATH
}

let cachedSession: Promise<ort.InferenceSession | null> | null = null

export function loadPoseSession(): Promise<ort.InferenceSession | null> {
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

export function __resetPoseCacheForTests(): void {
  cachedSession = null
}

export function __setPoseSessionForTests(
  session: ort.InferenceSession | null,
): void {
  cachedSession = Promise.resolve(session)
}

export interface PoseDetection {
  bbox: [number, number, number, number]
  confidence: number
  keypoints: { x: number; y: number; vis: number }[]
}

interface PreprocessedImage {
  tensor: ort.Tensor
  scale: number
  padX: number
  padY: number
  origW: number
  origH: number
}

async function preprocess(buffer: Buffer): Promise<PreprocessedImage> {
  const meta = await sharp(buffer).metadata()
  const origW = meta.width ?? 0
  const origH = meta.height ?? 0
  if (origW === 0 || origH === 0) {
    throw new Error('pose-detect: imagem sem dimensões')
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
    origW,
    origH,
  }
}

/** Parse + denormaliza coords para o espaço da imagem original. */
export function parsePoseDetections(
  output: Float32Array,
  numAnchors: number,
  pre: Pick<PreprocessedImage, 'scale' | 'padX' | 'padY' | 'origW' | 'origH'>,
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
    const x1 = (xc - w / 2 - pre.padX) / pre.scale
    const y1 = (yc - h / 2 - pre.padY) / pre.scale
    const x2 = (xc + w / 2 - pre.padX) / pre.scale
    const y2 = (yc + h / 2 - pre.padY) / pre.scale
    const clampX = (v: number) => Math.max(0, Math.min(pre.origW, v))
    const clampY = (v: number) => Math.max(0, Math.min(pre.origH, v))

    const keypoints: PoseDetection['keypoints'] = []
    for (let k = 0; k < 17; k += 1) {
      const base = (5 + k * 3) * numAnchors + a
      const kx = output[base] ?? 0
      const ky = output[base + numAnchors] ?? 0
      const vis = output[base + 2 * numAnchors] ?? 0
      keypoints.push({
        x: (kx - pre.padX) / pre.scale,
        y: (ky - pre.padY) / pre.scale,
        vis,
      })
    }
    detections.push({
      bbox: [clampX(x1), clampY(y1), clampX(x2), clampY(y2)],
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
  return inter / (aArea + bArea - inter)
}

export function nmsPoses(
  detections: PoseDetection[],
  iouThreshold = POSE_NMS_IOU_THRESHOLD,
): PoseDetection[] {
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence)
  const kept: PoseDetection[] = []
  for (const det of sorted) {
    if (kept.some((k) => iouBox(det.bbox, k.bbox) > iouThreshold)) continue
    kept.push(det)
  }
  return kept
}

/**
 * Detector completo: pré-processa, roda yolov8n-pose, parseia e aplica NMS.
 * Retorna null quando o modelo não está disponível ou a shape do output
 * é inesperada.
 */
export async function detectPosesOnImage(
  buffer: Buffer,
): Promise<PoseDetection[] | null> {
  const session = await loadPoseSession()
  if (!session) return null
  try {
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
    return nmsPoses(parsePoseDetections(data, numAnchors, pre))
  } catch {
    return null
  }
}
