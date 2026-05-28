import 'server-only'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'
import * as ort from 'onnxruntime-node'
import { detectPosesOnImage, type PoseDetection } from './pose-detect'

/**
 * Mirror selfie detection — cenários §2.1 C05.
 *
 * Sinal: cliente segura o celular pra tirar a foto no espelho. O risco é
 * que o modelo de try-on trate o celular como acessório alucinando uma bolsa
 * ou pulseira. Não bloqueamos (a foto pode ser válida pra try-on de top),
 * só sinalizamos pra UI mostrar "Use uma foto sem espelho pra melhor resultado".
 *
 * Heurística:
 *   1. Rodar YOLOv8n (já carregado pra subject-count) e extrair detecções
 *      de classe 67 (cell phone) com confidence alta.
 *   2. Rodar yolov8n-pose (já carregado) e pegar a posição dos pulsos.
 *   3. Se o centro de uma bbox de celular está perto de um pulso (dentro
 *      de fração da bbox-da-pessoa), flag = true.
 *
 * Graceful degradation: sem modelos → retorna `detected: false, method: 'unavailable'`.
 */

const DEFAULT_MODEL_PATH = resolve(process.cwd(), 'models', 'yolov8n.onnx')
const INPUT_SIZE = 640
const CELL_PHONE_CLASS_ID = 67
const PHONE_CONFIDENCE_MIN = 0.35
const WRIST_VISIBILITY_MIN = 0.4
const WRIST_PROXIMITY_FRACTION = 0.25 // distância máxima como fração do menor lado da bbox da pessoa

function resolveModelPath(): string {
  return process.env.YOLOV8N_ONNX_PATH ?? DEFAULT_MODEL_PATH
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

export function __resetMirrorSelfieCacheForTests(): void {
  cachedSession = null
}

export function __setMirrorSelfieSessionForTests(
  session: ort.InferenceSession | null,
): void {
  cachedSession = Promise.resolve(session)
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
  if (origW === 0 || origH === 0) throw new Error('mirror-selfie: imagem sem dimensões')
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

interface PhoneDetection {
  bbox: [number, number, number, number]
  confidence: number
}

/** Extrai bboxes de cell phone (class 67) em coords da imagem original. */
export function parsePhoneDetections(
  output: Float32Array,
  numClasses: number,
  numAnchors: number,
  pre: Pick<PreprocessedImage, 'scale' | 'padX' | 'padY' | 'origW' | 'origH'>,
  minConfidence = PHONE_CONFIDENCE_MIN,
): PhoneDetection[] {
  void numClasses
  const detections: PhoneDetection[] = []
  for (let a = 0; a < numAnchors; a += 1) {
    const phoneScore = output[(4 + CELL_PHONE_CLASS_ID) * numAnchors + a] ?? 0
    if (phoneScore < minConfidence) continue
    const xc = output[0 * numAnchors + a] ?? 0
    const yc = output[1 * numAnchors + a] ?? 0
    const w = output[2 * numAnchors + a] ?? 0
    const h = output[3 * numAnchors + a] ?? 0
    const x1 = (xc - w / 2 - pre.padX) / pre.scale
    const y1 = (yc - h / 2 - pre.padY) / pre.scale
    const x2 = (xc + w / 2 - pre.padX) / pre.scale
    const y2 = (yc + h / 2 - pre.padY) / pre.scale
    detections.push({
      bbox: [
        Math.max(0, Math.min(pre.origW, x1)),
        Math.max(0, Math.min(pre.origH, y1)),
        Math.max(0, Math.min(pre.origW, x2)),
        Math.max(0, Math.min(pre.origH, y2)),
      ],
      confidence: phoneScore,
    })
  }
  return detections
}

async function detectPhones(buffer: Buffer): Promise<PhoneDetection[] | null> {
  const session = await loadSession()
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
    if (dims.length !== 3 || dims[0] !== 1 || dims[1]! < 5) return null
    const numClasses = dims[1]! - 4
    const numAnchors = dims[2]!
    return parsePhoneDetections(data, numClasses, numAnchors, pre)
  } catch {
    return null
  }
}

/** Centro da bbox. */
function bboxCenter(bbox: [number, number, number, number]): [number, number] {
  return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]
}

/** Distância euclidiana. */
function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by)
}

/**
 * Verifica se algum celular detectado está perto de algum pulso visível.
 * Retorna a melhor evidência (par phone × wrist com menor distância).
 */
export function correlatePhoneToWrist(
  phones: PhoneDetection[],
  poses: PoseDetection[],
): { detected: boolean; closestDistance: number | null; phoneConfidence: number | null } {
  if (phones.length === 0 || poses.length === 0) {
    return { detected: false, closestDistance: null, phoneConfidence: null }
  }
  let best: { distance: number; phoneConf: number } | null = null
  for (const pose of poses) {
    const personBbox = pose.bbox
    const personSize = Math.min(personBbox[2] - personBbox[0], personBbox[3] - personBbox[1])
    if (personSize <= 0) continue
    const proximityThreshold = personSize * WRIST_PROXIMITY_FRACTION

    const wrists = [9, 10]
      .map((i) => pose.keypoints[i])
      .filter((kp): kp is { x: number; y: number; vis: number } =>
        Boolean(kp) && kp!.vis >= WRIST_VISIBILITY_MIN,
      )
    for (const wrist of wrists) {
      for (const phone of phones) {
        const [cx, cy] = bboxCenter(phone.bbox)
        const d = dist(cx, cy, wrist.x, wrist.y)
        if (d <= proximityThreshold) {
          if (!best || d < best.distance) {
            best = { distance: d, phoneConf: phone.confidence }
          }
        }
      }
    }
  }
  return {
    detected: best !== null,
    closestDistance: best?.distance ?? null,
    phoneConfidence: best?.phoneConf ?? null,
  }
}

export interface MirrorSelfieResult {
  detected: boolean
  method: 'yolov8n+pose' | 'unavailable'
  reason?: string
  phoneCount?: number
  closestPhoneToWristPx?: number | null
  phoneConfidence?: number | null
}

/**
 * Entry point: roda YOLOv8n + yolov8n-pose em paralelo e correlaciona.
 * NUNCA bloqueia geração — uso esperado é log + warning não-bloqueante.
 */
export async function detectMirrorSelfie(
  buffer: Buffer,
): Promise<MirrorSelfieResult> {
  try {
    const [phones, poses] = await Promise.all([
      detectPhones(buffer),
      detectPosesOnImage(buffer),
    ])
    if (!phones || !poses) {
      return { detected: false, method: 'unavailable', reason: 'model_not_loaded' }
    }
    const corr = correlatePhoneToWrist(phones, poses)
    return {
      detected: corr.detected,
      method: 'yolov8n+pose',
      phoneCount: phones.length,
      closestPhoneToWristPx: corr.closestDistance,
      phoneConfidence: corr.phoneConfidence,
    }
  } catch (err) {
    return {
      detected: false,
      method: 'unavailable',
      reason: err instanceof Error ? err.message : 'detection_failed',
    }
  }
}
