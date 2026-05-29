import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { checkPatternAlignment, chiSquaredDistance } from '../pattern-alignment'

async function solid(rgb: [number, number, number]): Promise<Buffer> {
  return sharp({
    create: { width: 400, height: 400, channels: 3, background: { r: rgb[0], g: rgb[1], b: rgb[2] } },
  })
    .png()
    .toBuffer()
}

/** Stripes pattern verticais alternando cores. */
async function verticalStripes(): Promise<Buffer> {
  const W = 400
  const H = 400
  const stripe = 20
  const pixels = Buffer.alloc(W * H * 3)
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const black = Math.floor(x / stripe) % 2 === 0
      const v = black ? 0 : 255
      const idx = (y * W + x) * 3
      pixels[idx] = v
      pixels[idx + 1] = v
      pixels[idx + 2] = v
    }
  }
  return sharp(pixels, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer()
}

describe('chiSquaredDistance', () => {
  it('histogramas idênticos → 0', () => {
    const h = new Float64Array([0.2, 0.3, 0.5])
    expect(chiSquaredDistance(h, h)).toBeCloseTo(0)
  })

  it('histogramas completamente diferentes → próximo de 1', () => {
    const a = new Float64Array([1, 0, 0])
    const b = new Float64Array([0, 0, 1])
    expect(chiSquaredDistance(a, b)).toBeGreaterThan(0.5)
  })

  it('histograma vazio em ambos os bins → ignora', () => {
    const a = new Float64Array([0, 0.5, 0.5])
    const b = new Float64Array([0, 0.5, 0.5])
    expect(chiSquaredDistance(a, b)).toBeCloseTo(0)
  })
})

describe('checkPatternAlignment', () => {
  it('imagens idênticas → distance ≈ 0', async () => {
    const stripes = await verticalStripes()
    const res = await checkPatternAlignment(stripes, stripes)
    expect(res.distance).toBeLessThan(0.01)
    expect(res.pass).toBe(true)
  })

  it('stripes vs solid → distance alta (high-freq vs low-freq)', async () => {
    const stripes = await verticalStripes()
    const solidGray = await solid([128, 128, 128])
    const res = await checkPatternAlignment(stripes, solidGray)
    expect(res.distance).toBeGreaterThan(0.1) // high-freq vs flat = grande gap
  })

  it('respeita threshold custom', async () => {
    const stripes = await verticalStripes()
    const solidGray = await solid([128, 128, 128])
    const strict = await checkPatternAlignment(stripes, solidGray, 0.01)
    expect(strict.pass).toBe(false)
    const loose = await checkPatternAlignment(stripes, solidGray, 0.99)
    expect(loose.pass).toBe(true)
  })

  it('marca method estável pra dashboard', async () => {
    const img = await solid([100, 100, 100])
    const res = await checkPatternAlignment(img, img)
    expect(res.method).toBe('gradient_histogram_chi2')
  })
})
