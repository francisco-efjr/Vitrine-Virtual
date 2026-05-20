import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { computeIdentitySimilarity } from '../identity-check'

/** Helper: gera uma PNG sintética sólida WxH com cor RGB dada. */
async function solidImage(w: number, h: number, r: number, g: number, b: number): Promise<Buffer> {
  return sharp({
    create: { width: w, height: h, channels: 3, background: { r, g, b } },
  })
    .png()
    .toBuffer()
}

/** Gradiente vertical (topo escuro → embaixo claro), tamanho fixo. */
async function gradientImage(w: number, h: number): Promise<Buffer> {
  const pixels = Buffer.alloc(w * h * 3)
  for (let y = 0; y < h; y += 1) {
    const v = Math.floor((y / h) * 255)
    for (let x = 0; x < w; x += 1) {
      const idx = (y * w + x) * 3
      pixels[idx] = v
      pixels[idx + 1] = v
      pixels[idx + 2] = v
    }
  }
  return sharp(pixels, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer()
}

describe('computeIdentitySimilarity (dHash proxy)', () => {
  it('retorna similarity = 1 para a mesma imagem', async () => {
    const img = await gradientImage(256, 256)
    const result = await computeIdentitySimilarity(img, img)
    expect(result.method).toBe('dhash_face_region_proxy')
    expect(result.similarity).toBe(1)
    expect(result.hammingDistance).toBe(0)
  })

  it('expõe similarity em [0, 1] e hamming em [0, 64]', async () => {
    const a = await solidImage(256, 256, 30, 30, 30)
    const b = await gradientImage(256, 256)
    const result = await computeIdentitySimilarity(a, b)
    expect(result.similarity).toBeGreaterThanOrEqual(0)
    expect(result.similarity).toBeLessThanOrEqual(1)
    expect(result.hammingDistance).toBeGreaterThanOrEqual(0)
    expect(result.hammingDistance).toBeLessThanOrEqual(64)
  })

  it('similarity de imagem sólida vs sólida (mesma cor) = 1', async () => {
    const a = await solidImage(200, 300, 120, 80, 40)
    const b = await solidImage(200, 300, 120, 80, 40)
    const result = await computeIdentitySimilarity(a, b)
    expect(result.similarity).toBe(1)
  })

  it('aceita imagens de tamanhos diferentes (extract+resize antes do hash)', async () => {
    const a = await solidImage(640, 960, 50, 50, 50)
    const b = await solidImage(320, 480, 50, 50, 50)
    const result = await computeIdentitySimilarity(a, b)
    expect(result.similarity).toBe(1)
  })
})
