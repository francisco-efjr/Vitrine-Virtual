import 'server-only'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'
import * as ort from 'onnxruntime-node'

/**
 * Subject count — research deliverable §14 / cenários §2.4.
 *
 * Detecta colagem silenciosa (duas pessoas no resultado) quando a foto da
 * peça é on-model e o pipeline acabou misturando cliente + modelo. Roda
 * YOLOv8n (COCO, classe 0 = "person") via `onnxruntime-node`.
 *
 * Por que YOLOv8n e não MediaPipe Pose:
 *   - MediaPipe Pose Landmarker conta poses, mas as duas pessoas precisam
 *     ter pose estimada — silhuetas oclusas viram 1 pose só.
 *   - YOLOv8 detecta bounding boxes independentes; é mais robusto para
 *     "tem mais de 1 pessoa no quadro" mesmo em cenas com colagem.
 *
 * Onde mora o modelo:
 *   - `_app/models/yolov8n.onnx` (gitignored). Rodar `pnpm models:download`
 *     pra puxar; em produção o `next build` já chama o script.
 *   - Override via env `YOLOV8N_ONNX_PATH` (absoluto).
 *
 * Graceful degradation:
 *   - Se o arquivo não existe ou a inferência falha, `countPersons` retorna
 *     `method: 'unavailable'` e o acceptance trata como `checked: false`.
 *   - A geração NUNCA é bloqueada por falha de carga de modelo.
 */

const DEFAULT_MODEL_PATH = resolve(process.cwd(), 'models', 'yolov8n.onnx')
const INPUT_SIZE = 640
const PERSON_CLASS_ID = 0
const PERSON_CONFIDENCE_MIN = 0.5
const NMS_IOU_THRESHOLD = 0.5

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

/** Test-only — reseta cache pra permitir reinjeção em fixtures. */
export function __resetSubjectCountCacheForTests(): void {
  cachedSession = null
}

/** Test-only — injeta uma session mockada (bypass do disco). */
export function __setSubjectCountSessionForTests(
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

/**
 * Letterbox resize para 640×640 mantendo aspect ratio. YOLOv8 é treinado
 * com padding cinza (114,114,114) e espera CHW float32 ∈ [0,1].
 */
async function preprocess(buffer: Buffer): Promise<PreprocessedImage> {
  const meta = await sharp(buffer).metadata()
  const origW = meta.width ?? 0
  const origH = meta.height ?? 0
  if (origW === 0 || origH === 0) {
    throw new Error('subject-count: imagem sem dimensões')
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

  // CHW float32 normalizado em [0,1]
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

export interface Detection {
  /** xyxy em coordenadas da imagem original. */
  bbox: [number, number, number, number]
  confidence: number
}

/**
 * Parse do output cru do YOLOv8 ([1, 84, 8400]) extraindo só "person" (class 0).
 * Convertemos xywh (centro) → xyxy nas coordenadas da imagem original
 * (desfaz o letterbox).
 */
export function parsePersonDetections(
  output: Float32Array,
  numClasses: number,
  numAnchors: number,
  pre: Pick<PreprocessedImage, 'scale' | 'padX' | 'padY' | 'origW' | 'origH'>,
  minConfidence = PERSON_CONFIDENCE_MIN,
): Detection[] {
  const detections: Detection[] = []
  // Layout: para cada feature f ∈ [0, 4+numClasses), valores ficam em
  // output[f * numAnchors + a] (CHW-style: feature primeiro, depois anchor).
  for (let a = 0; a < numAnchors; a += 1) {
    const personScore = output[(4 + PERSON_CLASS_ID) * numAnchors + a] ?? 0
    if (personScore < minConfidence) continue

    const xc = output[0 * numAnchors + a] ?? 0
    const yc = output[1 * numAnchors + a] ?? 0
    const w = output[2 * numAnchors + a] ?? 0
    const h = output[3 * numAnchors + a] ?? 0

    // xywh → xyxy no espaço 640×640
    const x1 = xc - w / 2
    const y1 = yc - h / 2
    const x2 = xc + w / 2
    const y2 = yc + h / 2

    // Remove letterbox e reescala pra imagem original
    const ox1 = (x1 - pre.padX) / pre.scale
    const oy1 = (y1 - pre.padY) / pre.scale
    const ox2 = (x2 - pre.padX) / pre.scale
    const oy2 = (y2 - pre.padY) / pre.scale

    const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v))
    detections.push({
      bbox: [
        clamp(ox1, pre.origW),
        clamp(oy1, pre.origH),
        clamp(ox2, pre.origW),
        clamp(oy2, pre.origH),
      ],
      confidence: personScore,
    })
    void numClasses // declarado por API mas não usado — só extraímos class 0
  }
  return detections
}

function iou(a: Detection, b: Detection): number {
  const [ax1, ay1, ax2, ay2] = a.bbox
  const [bx1, by1, bx2, by2] = b.bbox
  const ix1 = Math.max(ax1, bx1)
  const iy1 = Math.max(ay1, by1)
  const ix2 = Math.min(ax2, bx2)
  const iy2 = Math.min(ay2, by2)
  const iw = Math.max(0, ix2 - ix1)
  const ih = Math.max(0, iy2 - iy1)
  const inter = iw * ih
  if (inter === 0) return 0
  const aArea = (ax2 - ax1) * (ay2 - ay1)
  const bArea = (bx2 - bx1) * (by2 - by1)
  const union = aArea + bArea - inter
  return union > 0 ? inter / union : 0
}

/** NMS gulosa: ordena por confiança e descarta sobreposições > threshold. */
export function nonMaxSuppression(
  detections: Detection[],
  iouThreshold = NMS_IOU_THRESHOLD,
): Detection[] {
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence)
  const kept: Detection[] = []
  for (const det of sorted) {
    let suppressed = false
    for (const k of kept) {
      if (iou(det, k) > iouThreshold) {
        suppressed = true
        break
      }
    }
    if (!suppressed) kept.push(det)
  }
  return kept
}

export interface SubjectCountResult {
  count: number
  confidences: number[]
  method: 'yolov8n_onnx' | 'unavailable'
  reason?: string
}

/**
 * Conta pessoas distintas na imagem. Devolve `unavailable` se o modelo não
 * está disponível ou a inferência falhou (acceptance trata como checked:false).
 */
export async function countPersons(buffer: Buffer): Promise<SubjectCountResult> {
  const session = await loadSession()
  if (!session) {
    return {
      count: 0,
      confidences: [],
      method: 'unavailable',
      reason: 'model_not_loaded',
    }
  }

  try {
    const pre = await preprocess(buffer)
    const inputName = session.inputNames[0] ?? 'images'
    const feeds: Record<string, ort.Tensor> = { [inputName]: pre.tensor }
    const out = await session.run(feeds)
    const outputName = session.outputNames[0] ?? 'output0'
    const tensor = out[outputName]
    if (!tensor) throw new Error('subject-count: output ausente')
    const data = tensor.data as Float32Array
    const dims = tensor.dims
    // Esperado [1, 84, N]. Se vier diferente, abortamos pra não devolver lixo.
    if (dims.length !== 3 || dims[0] !== 1 || dims[1]! < 5) {
      throw new Error(`subject-count: shape inesperado ${JSON.stringify(dims)}`)
    }
    const numClasses = dims[1]! - 4
    const numAnchors = dims[2]!

    const raw = parsePersonDetections(data, numClasses, numAnchors, pre)
    const final = nonMaxSuppression(raw)
    return {
      count: final.length,
      confidences: final.map((d) => Number(d.confidence.toFixed(3))),
      method: 'yolov8n_onnx',
    }
  } catch (err) {
    return {
      count: 0,
      confidences: [],
      method: 'unavailable',
      reason: err instanceof Error ? err.message : 'inference_failed',
    }
  }
}
