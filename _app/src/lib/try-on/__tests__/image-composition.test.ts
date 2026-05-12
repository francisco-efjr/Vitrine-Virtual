import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { normalizeTryOnResultComposition } from '../image-composition'

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
