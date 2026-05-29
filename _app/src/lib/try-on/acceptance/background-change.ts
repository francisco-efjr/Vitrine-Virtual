import 'server-only'
import sharp from 'sharp'
import { detectPosesOnImage } from './pose-detect'

/**
 * Background unintended-change check — research §4.3 P2.15.
 *
 * Em modo `preserve_customer`, o fundo da foto do cliente é a "verdade".
 * Quando o try-on muda o fundo (e.g. cliente em casa → output em estúdio),
 * é uma violação do contrato do modo.
 *
 * Heurística:
 *   1. Localiza bbox da pessoa em ambas as imagens via yolov8n-pose.
 *   2. Coleta amostras de cor FORA do bbox (= fundo) em cada imagem.
 *   3. Histograma 8-bin de luminância × 8-bin de croma por imagem.
 *   4. Distância chi-squared.
 *
 * Não bloqueia geração (P2). Vira input do dashboard de calibração.
 * Só roda quando AcceptanceInput.backgroundMode === 'preserve_customer'.
 */

const RESIZE = 256
const HIST_BINS = 16 // luminância buckets

async function backgroundLuminanceHistogram(
  buffer: Buffer,
  personBbox: [number, number, number, number] | null,
): Promise<Float64Array | null> {
  const meta = await sharp(buffer).metadata()
  const W = meta.width ?? 0
  const H = meta.height ?? 0
  if (W === 0 || H === 0) return null

  // Reescala bbox pra coords [0, RESIZE]
  const sx = RESIZE / W
  const sy = RESIZE / H
  const bboxResized = personBbox
    ? ([
        Math.max(0, Math.floor(personBbox[0] * sx)),
        Math.max(0, Math.floor(personBbox[1] * sy)),
        Math.min(RESIZE, Math.ceil(personBbox[2] * sx)),
        Math.min(RESIZE, Math.ceil(personBbox[3] * sy)),
      ] as [number, number, number, number])
    : null

  const { data } = await sharp(buffer)
    .resize(RESIZE, RESIZE, { fit: 'fill', kernel: 'lanczos3' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const hist = new Float64Array(HIST_BINS)
  let count = 0
  for (let y = 0; y < RESIZE; y += 1) {
    for (let x = 0; x < RESIZE; x += 1) {
      // Skip pixels DENTRO do bbox da pessoa (queremos só o fundo)
      if (bboxResized) {
        if (
          x >= bboxResized[0] &&
          x < bboxResized[2] &&
          y >= bboxResized[1] &&
          y < bboxResized[3]
        ) {
          continue
        }
      }
      const v = data[y * RESIZE + x] ?? 0
      const bin = Math.min(HIST_BINS - 1, Math.floor((v / 256) * HIST_BINS))
      hist[bin]! += 1
      count += 1
    }
  }
  if (count === 0) return null
  for (let i = 0; i < HIST_BINS; i += 1) {
    hist[i] = (hist[i] ?? 0) / count
  }
  return hist
}

export function chiSquaredDistance(a: Float64Array, b: Float64Array): number {
  let sum = 0
  for (let i = 0; i < a.length; i += 1) {
    const ai = a[i] ?? 0
    const bi = b[i] ?? 0
    const denom = ai + bi
    if (denom === 0) continue
    sum += ((ai - bi) ** 2) / denom
  }
  return sum / 2
}

export interface BackgroundChangeResult {
  pass: boolean
  distance: number
  method: 'background_luminance_histogram'
  threshold: number
  reason?: string
}

const DEFAULT_THRESHOLD = 0.35

export async function checkBackgroundChange(
  customerBuffer: Buffer,
  resultBuffer: Buffer,
  threshold = DEFAULT_THRESHOLD,
): Promise<BackgroundChangeResult> {
  try {
    const [customerPoses, resultPoses] = await Promise.all([
      detectPosesOnImage(customerBuffer),
      detectPosesOnImage(resultBuffer),
    ])
    const customerBbox = customerPoses?.[0]?.bbox ?? null
    const resultBbox = resultPoses?.[0]?.bbox ?? null
    const [histIn, histOut] = await Promise.all([
      backgroundLuminanceHistogram(customerBuffer, customerBbox),
      backgroundLuminanceHistogram(resultBuffer, resultBbox),
    ])
    if (!histIn || !histOut) {
      return {
        pass: true,
        distance: 0,
        method: 'background_luminance_histogram',
        threshold,
        reason: 'histogram_failed',
      }
    }
    const distance = chiSquaredDistance(histIn, histOut)
    return {
      pass: distance <= threshold,
      distance,
      method: 'background_luminance_histogram',
      threshold,
    }
  } catch (err) {
    return {
      pass: true,
      distance: 0,
      method: 'background_luminance_histogram',
      threshold,
      reason: err instanceof Error ? err.message : 'check_failed',
    }
  }
}
