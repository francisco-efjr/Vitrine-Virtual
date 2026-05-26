import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import {
  detectCollageInResult,
  detectGarmentHasPerson,
  normalizeTryOnResultComposition,
} from '../image-composition'

describe('normalizeTryOnResultComposition', () => {
  it('recorta margens brancas quando a pessoa fica pequena no canvas', async () => {
    const width = 864
    const height = 1184
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <ellipse cx="450" cy="1085" rx="150" ry="32" fill="#e9e9e5"/>
        <rect x="355" y="310" width="190" height="760" rx="40" fill="#88aeca"/>
        <circle cx="450" cy="285" r="58" fill="#2a211d"/>
        <rect x="520" y="350" width="44" height="90" rx="10" fill="#111111"/>
      </svg>
    `
    const input = await sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer()

    const result = await normalizeTryOnResultComposition(input)

    expect(result.cropped).toBe(true)
    expect(result.original).toMatchObject({ width, height })
    expect(result.output).toMatchObject({ width, height })
    expect(result.foregroundBounds?.top).toBeGreaterThan(220)
    expect(result.cropBounds?.top).toBeGreaterThan(150)
    expect(result.cropBounds?.height).toBeLessThan(height * 0.9)
  })

  it('não recorta quando não encontra sujeito contra fundo branco', async () => {
    const input = await sharp({
      create: {
        width: 864,
        height: 1184,
        channels: 3,
        background: '#ffffff',
      },
    })
      .jpeg()
      .toBuffer()

    const result = await normalizeTryOnResultComposition(input)

    expect(result.cropped).toBe(false)
    expect(result.output).toMatchObject({ width: 864, height: 1184 })
  })
})

describe('detectGarmentHasPerson', () => {
  it('retorna true quando a peça é uma foto on-model com rosto/pescoço visíveis', async () => {
    const w = 600
    const h = 800
    // Simula foto on-model: rosto (skin-tone ~#d9a880) no terço superior +
    // garment azul no torso.
    const svg = `
      <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <circle cx="300" cy="160" r="80" fill="#d9a880"/>
        <rect x="240" y="220" width="120" height="60" fill="#d9a880"/>
        <rect x="180" y="280" width="240" height="380" fill="#3b6fb5"/>
      </svg>
    `
    const input = await sharp(Buffer.from(svg)).jpeg().toBuffer()
    expect(await detectGarmentHasPerson(input)).toBe(true)
  })

  it('retorna false em flat-lay (peça sem pessoa)', async () => {
    const w = 600
    const h = 800
    const svg = `
      <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <rect x="150" y="120" width="300" height="560" rx="20" fill="#3b6fb5"/>
      </svg>
    `
    const input = await sharp(Buffer.from(svg)).jpeg().toBuffer()
    expect(await detectGarmentHasPerson(input)).toBe(false)
  })

  it('retorna false em buffer inválido sem quebrar', async () => {
    expect(await detectGarmentHasPerson(Buffer.from([1, 2, 3]))).toBe(false)
  })
})

describe('detectCollageInResult', () => {
  it('detecta colagem com duas pessoas lado-a-lado e gap vertical no meio', async () => {
    const w = 1000
    const h = 1000
    // Duas silhuetas escuras com um gap branco entre 380px e 620px (24% do width).
    const svg = `
      <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <rect x="60" y="120" width="320" height="760" fill="#2a211d"/>
        <rect x="620" y="120" width="320" height="760" fill="#2a211d"/>
      </svg>
    `
    const input = await sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer()
    const result = await detectCollageInResult(input)
    expect(result.isCollage).toBe(true)
    expect(result.reason).toBe('vertical_gap')
    expect(result.details?.gapWidthFraction).toBeGreaterThan(0.15)
  })

  it('não detecta colagem em sujeito único centralizado', async () => {
    const w = 1000
    const h = 1000
    const svg = `
      <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <rect x="400" y="100" width="200" height="800" fill="#2a211d"/>
        <circle cx="500" cy="180" r="80" fill="#2a211d"/>
      </svg>
    `
    const input = await sharp(Buffer.from(svg)).jpeg().toBuffer()
    const result = await detectCollageInResult(input)
    expect(result.isCollage).toBe(false)
  })

  it('não acusa falso-positivo em buffer inválido', async () => {
    const result = await detectCollageInResult(Buffer.from([1, 2, 3]))
    expect(result.isCollage).toBe(false)
  })
})
