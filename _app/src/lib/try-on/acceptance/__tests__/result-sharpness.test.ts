import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { runAcceptanceChecks } from '../index'

/** Imagem sólida — zero variação de textura → Laplacian variance ≈ 0. */
async function solidImage(w: number, h: number): Promise<Buffer> {
  return sharp({
    create: { width: w, height: h, channels: 3, background: { r: 120, g: 80, b: 60 } },
  })
    .jpeg()
    .toBuffer()
}

/** Imagem com ruído aleatório — alta variação → Laplacian variance alto. */
async function noisyImage(w: number, h: number): Promise<Buffer> {
  const pixels = Buffer.alloc(w * h * 3)
  // Padrão xadrez 4×4: contraste máximo, riqueza de bordas.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = ((x >> 2) + (y >> 2)) % 2 === 0 ? 240 : 15
      const idx = (y * w + x) * 3
      pixels[idx] = v
      pixels[idx + 1] = v
      pixels[idx + 2] = v
    }
  }
  return sharp(pixels, { raw: { width: w, height: h, channels: 3 } }).jpeg().toBuffer()
}

/** Input mínimo válido para runAcceptanceChecks. */
async function makeInput(result: Buffer) {
  const dummyBuf = await solidImage(64, 64)
  return {
    customerImageBuffer: dummyBuf,
    garmentImageBuffer: Buffer.alloc(0),
    resultImageBuffer: result,
    safetyRatings: [],
  }
}

describe('acceptance/resultSharpness', () => {
  it('checked=true para imagem sólida (zero textura) → pass=false', async () => {
    const result = await solidImage(512, 512)
    const acceptance = await runAcceptanceChecks(await makeInput(result))
    const check = acceptance.checks.find((c) => c.name === 'resultSharpness')
    expect(check).toBeDefined()
    expect(check!.checked).toBe(true)
    expect(check!.pass).toBe(false)
    expect(check!.details).toMatchObject({ threshold: 25 })
  })

  it('checked=true para imagem com textura (xadrez) → pass=true', async () => {
    const result = await noisyImage(512, 512)
    const acceptance = await runAcceptanceChecks(await makeInput(result))
    const check = acceptance.checks.find((c) => c.name === 'resultSharpness')
    expect(check).toBeDefined()
    expect(check!.checked).toBe(true)
    expect(check!.pass).toBe(true)
    const variance = (check!.details as Record<string, number>)?.variance ?? 0
    expect(variance).toBeGreaterThan(25)
  })

  it('expõe variance nos details', async () => {
    const result = await noisyImage(256, 256)
    const acceptance = await runAcceptanceChecks(await makeInput(result))
    const check = acceptance.checks.find((c) => c.name === 'resultSharpness')
    expect(typeof (check!.details as Record<string, unknown>)?.variance).toBe('number')
  })

  it('resultSharpness aparece no array de checks', async () => {
    const result = await solidImage(300, 400)
    const acceptance = await runAcceptanceChecks(await makeInput(result))
    const names = acceptance.checks.map((c) => c.name)
    expect(names).toContain('resultSharpness')
  })
})
