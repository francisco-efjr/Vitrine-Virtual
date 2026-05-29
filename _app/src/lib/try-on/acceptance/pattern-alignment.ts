import 'server-only'
import sharp from 'sharp'

/**
 * Pattern alignment check — research §4.3 P2.12.
 *
 * Heurística: peças com padrão forte (listras, xadrez, animal print) têm
 * MUITA energia de alta frequência. Quando o try-on quebra o padrão
 * (alinhamento errado, escala mudada, padrão "borrado"), o histograma
 * de gradientes do output diverge bastante do input.
 *
 * Implementação simples sem FFT:
 *   1. Computa magnitude de gradiente (Sobel approximation via Laplaciana
 *      compacta) sobre cada imagem.
 *   2. Bin em histograma de 16 níveis.
 *   3. Distância chi-squared entre os dois histogramas.
 *
 * Sem dep nova — só `sharp`. Não bloqueia geração: serve pra logar e
 * calibrar threshold no dashboard.
 */

const RESIZE_SIZE = 256 // resoluções razoáveis pra captar pattern sem custar
const NUM_BINS = 16
const HISTOGRAM_DEFAULT_THRESHOLD = 0.6

async function gradientHistogram(buffer: Buffer): Promise<Float64Array> {
  const { data } = await sharp(buffer)
    .resize(RESIZE_SIZE, RESIZE_SIZE, { fit: 'fill', kernel: 'lanczos3' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const W = RESIZE_SIZE
  const H = RESIZE_SIZE
  // Sobel approximation
  const magnitudes: number[] = []
  for (let y = 1; y < H - 1; y += 1) {
    for (let x = 1; x < W - 1; x += 1) {
      const i = y * W + x
      // Sobel X
      const gx =
        -1 * (data[i - W - 1] ?? 0) +
        1 * (data[i - W + 1] ?? 0) +
        -2 * (data[i - 1] ?? 0) +
        2 * (data[i + 1] ?? 0) +
        -1 * (data[i + W - 1] ?? 0) +
        1 * (data[i + W + 1] ?? 0)
      // Sobel Y
      const gy =
        -1 * (data[i - W - 1] ?? 0) +
        -2 * (data[i - W] ?? 0) +
        -1 * (data[i - W + 1] ?? 0) +
        1 * (data[i + W - 1] ?? 0) +
        2 * (data[i + W] ?? 0) +
        1 * (data[i + W + 1] ?? 0)
      magnitudes.push(Math.hypot(gx, gy))
    }
  }
  // Bin no histograma: max é ~4×255 = 1020 (worst case Sobel)
  const maxMag = 1020
  const bins = new Float64Array(NUM_BINS)
  for (const m of magnitudes) {
    const idx = Math.min(NUM_BINS - 1, Math.floor((m / maxMag) * NUM_BINS))
    bins[idx]! += 1
  }
  // Normaliza
  const total = magnitudes.length
  for (let i = 0; i < NUM_BINS; i += 1) {
    bins[i] = (bins[i] ?? 0) / total
  }
  return bins
}

/** Chi-squared distance entre dois histogramas normalizados ∈ [0, 1]. */
export function chiSquaredDistance(a: Float64Array, b: Float64Array): number {
  let sum = 0
  for (let i = 0; i < a.length; i += 1) {
    const ai = a[i] ?? 0
    const bi = b[i] ?? 0
    const denom = ai + bi
    if (denom === 0) continue
    sum += ((ai - bi) ** 2) / denom
  }
  return sum / 2 // normaliza ∈ [0, 1]
}

export interface PatternAlignmentResult {
  pass: boolean
  /** Distância de histograma de gradientes ∈ [0, 1]. 0 = idêntico, 1 = oposto. */
  distance: number
  method: 'gradient_histogram_chi2'
  threshold: number
}

export async function checkPatternAlignment(
  garmentBuffer: Buffer,
  resultBuffer: Buffer,
  threshold = HISTOGRAM_DEFAULT_THRESHOLD,
): Promise<PatternAlignmentResult> {
  const [histGarment, histResult] = await Promise.all([
    gradientHistogram(garmentBuffer),
    gradientHistogram(resultBuffer),
  ])
  const distance = chiSquaredDistance(histGarment, histResult)
  return {
    pass: distance <= threshold,
    distance,
    method: 'gradient_histogram_chi2',
    threshold,
  }
}
