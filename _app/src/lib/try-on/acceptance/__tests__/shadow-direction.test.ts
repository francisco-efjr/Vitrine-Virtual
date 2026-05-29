import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import {
  angleBetween,
  checkShadowDirection,
  lightDirection,
} from '../shadow-direction'

describe('angleBetween', () => {
  it('vetores idênticos → 0', () => {
    expect(angleBetween({ dx: 1, dy: 1 }, { dx: 1, dy: 1 })).toBeCloseTo(0)
  })

  it('vetores opostos → π', () => {
    expect(angleBetween({ dx: 1, dy: 0 }, { dx: -1, dy: 0 })).toBeCloseTo(Math.PI)
  })

  it('vetores perpendiculares → π/2', () => {
    expect(angleBetween({ dx: 1, dy: 0 }, { dx: 0, dy: 1 })).toBeCloseTo(Math.PI / 2)
  })

  it('vetor zero → 0 (sem direção definida)', () => {
    expect(angleBetween({ dx: 0, dy: 0 }, { dx: 1, dy: 0 })).toBe(0)
  })
})

describe('lightDirection', () => {
  it('grid uniforme → vetor ≈ zero', () => {
    const grid = [
      [128, 128, 128],
      [128, 128, 128],
      [128, 128, 128],
    ]
    const v = lightDirection(grid)
    expect(v.magnitude).toBeCloseTo(0)
  })

  it('canto top-left mais brilhante → vetor aponta pra (-, -)', () => {
    const grid = [
      [255, 100, 0],
      [100, 50, 0],
      [0, 0, 0],
    ]
    const v = lightDirection(grid)
    expect(v.dx).toBeLessThan(0)
    expect(v.dy).toBeLessThan(0)
  })

  it('canto bottom-right mais brilhante → vetor aponta pra (+, +)', () => {
    const grid = [
      [0, 0, 0],
      [0, 50, 100],
      [0, 100, 255],
    ]
    const v = lightDirection(grid)
    expect(v.dx).toBeGreaterThan(0)
    expect(v.dy).toBeGreaterThan(0)
  })
})

describe('checkShadowDirection (integration)', () => {
  /** Gradient image: brilho linear de left→right OR top→bottom. */
  async function gradient(direction: 'horizontal' | 'vertical'): Promise<Buffer> {
    const W = 200
    const H = 200
    const pixels = Buffer.alloc(W * H * 3)
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const v = direction === 'horizontal' ? Math.floor((x / W) * 255) : Math.floor((y / H) * 255)
        const idx = (y * W + x) * 3
        pixels[idx] = v
        pixels[idx + 1] = v
        pixels[idx + 2] = v
      }
    }
    return sharp(pixels, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer()
  }

  it('mesmo gradiente em ambas → ângulo ≈ 0', async () => {
    const horiz = await gradient('horizontal')
    const res = await checkShadowDirection(horiz, horiz)
    expect(res.angleDegrees).toBeLessThan(5)
    expect(res.pass).toBe(true)
  })

  it('gradiente perpendicular → ângulo ≈ 90°', async () => {
    const horiz = await gradient('horizontal')
    const vert = await gradient('vertical')
    const res = await checkShadowDirection(horiz, vert)
    expect(res.angleDegrees).toBeGreaterThan(60)
    expect(res.pass).toBe(false) // > 60° threshold default
  })
})
