import 'server-only'
import sharp from 'sharp'

/**
 * Shadow direction check — research §4.3 P2.13.
 *
 * Para `preserve_customer` mode, a iluminação ambiente do cliente é a
 * fonte de verdade. Quando o try-on muda a direção das sombras (e.g.
 * input com luz vindo da esquerda → output com luz vindo de cima), o
 * resultado fica "colado" e estranho.
 *
 * Heurística leve:
 *   1. Amostra média de luminância em 9 regiões (3×3 grid).
 *   2. Computa o vetor gradiente "centro → mais brilhante" pra cada imagem.
 *   3. Distância angular entre os dois vetores → flag se > threshold.
 *
 * Não usa stats() do sharp por causa do bug observado em color-check —
 * cálculo manual via raw bytes.
 */

const GRID_SIZE = 3
const RESIZE = 192 // pequeno suficiente pra ser barato
const DEFAULT_ANGLE_THRESHOLD_RAD = Math.PI / 3 // 60° divergência = flag

async function brightnessGrid(buffer: Buffer): Promise<number[][]> {
  const { data } = await sharp(buffer)
    .resize(RESIZE, RESIZE, { fit: 'fill', kernel: 'lanczos3' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const cellSize = Math.floor(RESIZE / GRID_SIZE)
  const grid: number[][] = []
  for (let gy = 0; gy < GRID_SIZE; gy += 1) {
    const row: number[] = []
    for (let gx = 0; gx < GRID_SIZE; gx += 1) {
      let sum = 0
      let count = 0
      const yStart = gy * cellSize
      const yEnd = Math.min(RESIZE, yStart + cellSize)
      const xStart = gx * cellSize
      const xEnd = Math.min(RESIZE, xStart + cellSize)
      for (let y = yStart; y < yEnd; y += 1) {
        for (let x = xStart; x < xEnd; x += 1) {
          sum += data[y * RESIZE + x] ?? 0
          count += 1
        }
      }
      row.push(sum / Math.max(1, count))
    }
    grid.push(row)
  }
  return grid
}

/**
 * Vetor (dx, dy) apontando do centro do grid pro cell mais brilhante.
 * Usa peso por (brilho - médio)² pra suavizar.
 */
export function lightDirection(grid: number[][]): { dx: number; dy: number; magnitude: number } {
  // Centro do grid em coords [0, GRID_SIZE-1]
  const cx = (GRID_SIZE - 1) / 2
  const cy = (GRID_SIZE - 1) / 2
  // Brilho médio
  let mean = 0
  for (const row of grid) for (const v of row) mean += v
  mean /= GRID_SIZE * GRID_SIZE

  let dx = 0
  let dy = 0
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const w = (grid[y]![x]! - mean) ** 2 * Math.sign(grid[y]![x]! - mean)
      dx += (x - cx) * w
      dy += (y - cy) * w
    }
  }
  const magnitude = Math.hypot(dx, dy)
  return { dx, dy, magnitude }
}

/** Ângulo entre dois vetores 2D (radians). */
export function angleBetween(
  a: { dx: number; dy: number },
  b: { dx: number; dy: number },
): number {
  const dotAB = a.dx * b.dx + a.dy * b.dy
  const magA = Math.hypot(a.dx, a.dy)
  const magB = Math.hypot(b.dx, b.dy)
  if (magA === 0 || magB === 0) return 0
  const cos = Math.max(-1, Math.min(1, dotAB / (magA * magB)))
  return Math.acos(cos)
}

export interface ShadowDirectionResult {
  pass: boolean
  /** Ângulo entre direção de luz input vs output (radians). */
  angleRadians: number
  /** Versão em graus pra log. */
  angleDegrees: number
  /** Magnitudes do vetor de luz em cada imagem (debug). */
  inputMagnitude: number
  outputMagnitude: number
  method: 'grid_brightness_angular'
  threshold: number
}

export async function checkShadowDirection(
  customerBuffer: Buffer,
  resultBuffer: Buffer,
  thresholdRad = DEFAULT_ANGLE_THRESHOLD_RAD,
): Promise<ShadowDirectionResult> {
  const [gridIn, gridOut] = await Promise.all([
    brightnessGrid(customerBuffer),
    brightnessGrid(resultBuffer),
  ])
  const lightIn = lightDirection(gridIn)
  const lightOut = lightDirection(gridOut)
  const angle = angleBetween(lightIn, lightOut)
  return {
    pass: angle <= thresholdRad,
    angleRadians: angle,
    angleDegrees: (angle * 180) / Math.PI,
    inputMagnitude: lightIn.magnitude,
    outputMagnitude: lightOut.magnitude,
    method: 'grid_brightness_angular',
    threshold: thresholdRad,
  }
}
