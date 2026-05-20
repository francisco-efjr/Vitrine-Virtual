import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { ciede2000, computeGarmentColorFidelity } from '../color-check'

async function solid(w: number, h: number, r: number, g: number, b: number): Promise<Buffer> {
  return sharp({
    create: { width: w, height: h, channels: 3, background: { r, g, b } },
  })
    .png()
    .toBuffer()
}

describe('ciede2000', () => {
  // Test vectors de Sharma, Wu, Dalal (2005) — Table 1. Calculados em Lab
  // diretamente (não passam por RGB→Lab, então independem de gamma).
  // Fonte: https://hajim.rochester.edu/ece/sites/gsharma/ciede2000/dataNprograms/ciede2000testdata.txt
  const cases: Array<{ name: string; a: [number, number, number]; b: [number, number, number]; expected: number }> = [
    { name: 'idêntico', a: [50, 0, 0], b: [50, 0, 0], expected: 0 },
    { name: 'Sharma row 1', a: [50, 2.6772, -79.7751], b: [50, 0, -82.7485], expected: 2.0425 },
    { name: 'Sharma row 14', a: [60.2574, -34.0099, 36.2677], b: [60.4626, -34.1751, 39.4387], expected: 1.2644 },
  ]

  for (const c of cases) {
    it(`bate a referência: ${c.name}`, () => {
      const dE = ciede2000({ L: c.a[0], a: c.a[1], b: c.a[2] }, { L: c.b[0], a: c.b[1], b: c.b[2] })
      expect(dE).toBeCloseTo(c.expected, 2)
    })
  }
})

describe('computeGarmentColorFidelity', () => {
  it('ΔE ≈ 0 para a mesma cor sólida', async () => {
    const a = await solid(128, 128, 120, 80, 40)
    const b = await solid(128, 128, 120, 80, 40)
    const result = await computeGarmentColorFidelity(a, b)
    expect(result.method).toBe('ciede2000_center_patch')
    expect(result.deltaE).toBeLessThan(0.01)
  })

  it('ΔE alto para cores muito diferentes (vermelho × verde)', async () => {
    const red = await solid(256, 256, 220, 20, 20)
    const green = await solid(256, 256, 20, 200, 20)
    const result = await computeGarmentColorFidelity(red, green)
    // Vermelho saturado vs verde saturado em CIEDE2000 fica ≫ 50.
    expect(result.deltaE).toBeGreaterThan(50)
  })

  it('aceita imagens de tamanhos diferentes', async () => {
    const a = await solid(400, 600, 50, 50, 50)
    const b = await solid(800, 1200, 50, 50, 50)
    const result = await computeGarmentColorFidelity(a, b)
    expect(result.deltaE).toBeLessThan(0.01)
  })

  it('expõe Lab das duas amostras nos detalhes', async () => {
    const a = await solid(128, 128, 255, 255, 255)
    const b = await solid(128, 128, 255, 255, 255)
    const result = await computeGarmentColorFidelity(a, b)
    // Branco em D65 ≈ L=100, a=0, b=0
    expect(result.sourceLab.L).toBeCloseTo(100, 0)
    expect(result.sourceLab.a).toBeCloseTo(0, 0)
    expect(result.sourceLab.b).toBeCloseTo(0, 0)
    expect(result.resultLab.L).toBeCloseTo(100, 0)
  })
})
