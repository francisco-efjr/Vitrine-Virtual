import { describe, expect, it } from 'vitest'
import { chiSquaredDistance } from '../background-change'

describe('chiSquaredDistance (background histograms)', () => {
  it('histogramas idênticos → 0', () => {
    const h = new Float64Array([0.2, 0.3, 0.5])
    expect(chiSquaredDistance(h, h)).toBeCloseTo(0)
  })

  it('histogramas opostos → próximo de 1', () => {
    const a = new Float64Array([1, 0, 0])
    const b = new Float64Array([0, 0, 1])
    expect(chiSquaredDistance(a, b)).toBeGreaterThan(0.5)
  })

  it('histogramas parcialmente sobrepostos → valor intermediário', () => {
    const a = new Float64Array([0.5, 0.5, 0])
    const b = new Float64Array([0, 0.5, 0.5])
    const d = chiSquaredDistance(a, b)
    expect(d).toBeGreaterThan(0)
    expect(d).toBeLessThan(1)
  })
})
