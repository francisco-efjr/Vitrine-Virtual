import 'server-only'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'
import * as ort from 'onnxruntime-node'

/**
 * ArcFace face embedding — research §14.
 *
 * Substitui o dHash proxy quando o modelo está disponível. Espera um modelo
 * ResNet-50/MobileFaceNet treinado com ArcFace loss, entrada 112×112×3
 * (RGB), output embedding 512-d (ou 128-d, lidamos via dim dinâmico).
 *
 * Normalização padrão InsightFace: `(pixel - 127.5) / 128.0`, NCHW.
 *
 * Modelos compatíveis (configuráveis via env):
 *   - InsightFace `w600k_r50` (ResNet50, ~166MB, embedding 512-d)
 *   - InsightFace `w600k_mbf` (MobileFaceNet, ~13MB, embedding 512-d)
 *
 * Por padrão tentamos carregar `models/arcface.onnx`. Override:
 *   - `ARCFACE_ONNX_PATH` (absoluto)
 *   - `MODELS_ARCFACE_URL` (no script de download)
 */

const DEFAULT_MODEL_PATH = resolve(process.cwd(), 'models', 'arcface.onnx')
const INPUT_SIZE = 112

function resolveModelPath(): string {
  return process.env.ARCFACE_ONNX_PATH ?? DEFAULT_MODEL_PATH
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

export function __resetArcfaceCacheForTests(): void {
  cachedSession = null
}

export function __setArcfaceSessionForTests(
  session: ort.InferenceSession | null,
): void {
  cachedSession = Promise.resolve(session)
}

/** Pré-processa face crop pra ArcFace: 112×112 RGB, normalizado, NCHW. */
async function preprocessFace(
  imageBuffer: Buffer,
  faceBbox: [number, number, number, number] | null,
): Promise<ort.Tensor> {
  let pipeline = sharp(imageBuffer)
  if (faceBbox) {
    const meta = await sharp(imageBuffer).metadata()
    const W = meta.width ?? 0
    const H = meta.height ?? 0
    const [x1, y1, x2, y2] = faceBbox
    const left = Math.max(0, Math.floor(x1))
    const top = Math.max(0, Math.floor(y1))
    const width = Math.max(1, Math.min(W - left, Math.ceil(x2 - x1)))
    const height = Math.max(1, Math.min(H - top, Math.ceil(y2 - y1)))
    pipeline = pipeline.extract({ left, top, width, height })
  }
  const buf = await pipeline
    .resize(INPUT_SIZE, INPUT_SIZE, { fit: 'fill', kernel: 'lanczos3' })
    .removeAlpha()
    .raw()
    .toBuffer()

  const pixelCount = INPUT_SIZE * INPUT_SIZE
  const data = new Float32Array(3 * pixelCount)
  for (let i = 0; i < pixelCount; i += 1) {
    const r = buf[i * 3] ?? 0
    const g = buf[i * 3 + 1] ?? 0
    const b = buf[i * 3 + 2] ?? 0
    // Normalização canônica InsightFace
    data[i] = (r - 127.5) / 128
    data[i + pixelCount] = (g - 127.5) / 128
    data[i + 2 * pixelCount] = (b - 127.5) / 128
  }
  return new ort.Tensor('float32', data, [1, 3, INPUT_SIZE, INPUT_SIZE])
}

function l2Normalize(v: Float32Array): Float32Array {
  let norm = 0
  for (let i = 0; i < v.length; i += 1) norm += v[i]! * v[i]!
  norm = Math.sqrt(norm) || 1
  const out = new Float32Array(v.length)
  for (let i = 0; i < v.length; i += 1) out[i] = v[i]! / norm
  return out
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0
  let dot = 0
  for (let i = 0; i < a.length; i += 1) dot += a[i]! * b[i]!
  return dot
}

export interface ArcfaceEmbedding {
  embedding: Float32Array
  dim: number
}

export async function embedFace(
  imageBuffer: Buffer,
  faceBbox: [number, number, number, number] | null,
): Promise<ArcfaceEmbedding | null> {
  const session = await loadSession()
  if (!session) return null
  try {
    const tensor = await preprocessFace(imageBuffer, faceBbox)
    const inputName = session.inputNames[0] ?? 'input.1'
    const out = await session.run({ [inputName]: tensor })
    const outputName = session.outputNames[0] ?? '683'
    const outTensor = out[outputName]
    if (!outTensor) return null
    const raw = outTensor.data as Float32Array
    const normalized = l2Normalize(raw)
    return { embedding: normalized, dim: normalized.length }
  } catch {
    return null
  }
}

export interface ArcfaceSimilarity {
  similarity: number
  dim: number
  method: 'arcface_cosine'
}

/**
 * Cosine similarity entre duas faces. Retorna null se o modelo não está
 * disponível ou se uma das embeddings falhou.
 */
export async function arcfaceSimilarity(
  customerImage: Buffer,
  resultImage: Buffer,
  customerFaceBbox: [number, number, number, number] | null,
  resultFaceBbox: [number, number, number, number] | null,
): Promise<ArcfaceSimilarity | null> {
  const [a, b] = await Promise.all([
    embedFace(customerImage, customerFaceBbox),
    embedFace(resultImage, resultFaceBbox),
  ])
  if (!a || !b) return null
  if (a.dim !== b.dim) return null
  return {
    similarity: cosineSimilarity(a.embedding, b.embedding),
    dim: a.dim,
    method: 'arcface_cosine',
  }
}
