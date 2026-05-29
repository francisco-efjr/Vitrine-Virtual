import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { computeGarmentColorFidelity, regionForCategory } from '../color-check'

/**
 * Constrói imagem WxH bicolor via pixel raw — top half cor A, bottom half cor B.
 * Mais robusto que sharp.composite() (que pode confundir alpha em PNGs `create`).
 */
async function bicolorImage(
  topRgb: [number, number, number],
  bottomRgb: [number, number, number],
): Promise<Buffer> {
  const W = 640
  const H = 1280
  const pixels = Buffer.alloc(W * H * 3)
  for (let y = 0; y < H; y += 1) {
    const [r, g, b] = y < H / 2 ? topRgb : bottomRgb
    for (let x = 0; x < W; x += 1) {
      const idx = (y * W + x) * 3
      pixels[idx] = r
      pixels[idx + 1] = g
      pixels[idx + 2] = b
    }
  }
  return sharp(pixels, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer()
}

async function solid(rgb: [number, number, number]): Promise<Buffer> {
  return sharp({
    create: { width: 640, height: 640, channels: 3, background: { r: rgb[0], g: rgb[1], b: rgb[2] } },
  })
    .png()
    .toBuffer()
}

describe('regionForCategory', () => {
  it('mapeia categorias para regiões corretas', () => {
    expect(regionForCategory('tops')).toBe('upper-center')
    expect(regionForCategory('outerwear')).toBe('upper-center')
    expect(regionForCategory('bottoms')).toBe('lower-center')
    expect(regionForCategory('one-pieces')).toBe('vertical-average')
    expect(regionForCategory('swimwear')).toBe('vertical-average')
    expect(regionForCategory('accessories')).toBe('central')
    expect(regionForCategory('auto')).toBe('central')
  })
})

describe('computeGarmentColorFidelity — patch por categoria', () => {
  it("category='tops' sampleia região superior e bate mais com top do bicolor", async () => {
    const redGarment = await solid([200, 30, 30])
    const result = await bicolorImage([200, 30, 30], [30, 30, 200])
    const fidTops = await computeGarmentColorFidelity(redGarment, result, 'tops')
    const fidBottoms = await computeGarmentColorFidelity(redGarment, result, 'bottoms')
    expect(fidTops.method).toBe('ciede2000_upper_center')
    expect(fidBottoms.method).toBe('ciede2000_lower_center')
    // Tops deve estar SIGNIFICATIVAMENTE mais próximo do garment vermelho que bottoms.
    expect(fidTops.deltaE).toBeLessThan(fidBottoms.deltaE)
  })

  it("category='bottoms' sampleia região inferior e bate mais com bottom do bicolor", async () => {
    const blueGarment = await solid([30, 30, 200])
    const result = await bicolorImage([200, 30, 30], [30, 30, 200])
    const fidTops = await computeGarmentColorFidelity(blueGarment, result, 'tops')
    const fidBottoms = await computeGarmentColorFidelity(blueGarment, result, 'bottoms')
    // Garment é azul → bottoms (azul) deve estar mais próximo que tops (vermelho).
    expect(fidBottoms.deltaE).toBeLessThan(fidTops.deltaE)
  })

  it("category='one-pieces' tira média vertical", async () => {
    const purpleGarment = await solid([110, 30, 110])
    const result = await bicolorImage([200, 30, 30], [30, 30, 200])
    const fid = await computeGarmentColorFidelity(purpleGarment, result, 'one-pieces')
    expect(fid.method).toBe('ciede2000_vertical_average')
    expect(Number.isFinite(fid.deltaE)).toBe(true)
  })

  it("category='auto' mantém compatibilidade com patch central", async () => {
    const garment = await solid([100, 100, 100])
    const result = await solid([100, 100, 100])
    const fid = await computeGarmentColorFidelity(garment, result, 'auto')
    expect(fid.method).toBe('ciede2000_center_patch')
    expect(fid.deltaE).toBeLessThan(1)
  })

  it('default (sem categoria) cai em patch central', async () => {
    const garment = await solid([100, 100, 100])
    const result = await solid([100, 100, 100])
    const fid = await computeGarmentColorFidelity(garment, result)
    expect(fid.method).toBe('ciede2000_center_patch')
  })

  it('aceita options object também', async () => {
    const garment = await solid([200, 30, 30])
    const result = await bicolorImage([200, 30, 30], [30, 30, 200])
    const fid = await computeGarmentColorFidelity(garment, result, {
      category: 'tops',
      garmentPhotoType: 'flat-lay',
    })
    expect(fid.method).toBe('ciede2000_upper_center')
  })
})
