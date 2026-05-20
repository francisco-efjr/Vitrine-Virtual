import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { runAcceptanceChecks } from '..'
import type { SafetyRating } from '../../types'

/** Mini PNG real, pra os outros checks (resolution) não explodirem. */
async function tinyImage(): Promise<Buffer> {
  return sharp({
    create: { width: 1024, height: 1536, channels: 3, background: { r: 200, g: 180, b: 140 } },
  })
    .jpeg()
    .toBuffer()
}

async function run(safetyRatings?: SafetyRating[]) {
  const img = await tinyImage()
  const result = await runAcceptanceChecks({
    customerImageBuffer: img,
    garmentImageBuffer: img,
    resultImageBuffer: img,
    safetyRatings,
  })
  return result.checks.find((c) => c.name === 'nsfwClean')!
}

describe('nsfwClean', () => {
  it('checked=false quando provider não devolveu safetyRatings', async () => {
    const check = await run(undefined)
    expect(check.checked).toBe(false)
    expect(check.pass).toBe(true)
    expect(check.details?.reason).toBe('no_safety_ratings_from_provider')
  })

  it('passa quando todas categorias estão em NEGLIGIBLE/LOW', async () => {
    const check = await run([
      { category: 'HARM_CATEGORY_SEXUAL', probability: 'NEGLIGIBLE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', probability: 'LOW' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', probability: 'NEGLIGIBLE' },
    ])
    expect(check.checked).toBe(true)
    expect(check.pass).toBe(true)
  })

  it('falha quando o provider marcou blocked=true', async () => {
    const check = await run([
      { category: 'HARM_CATEGORY_SEXUAL', probability: 'LOW', blocked: true },
    ])
    expect(check.checked).toBe(true)
    expect(check.pass).toBe(false)
    expect(check.details?.reason).toBe('provider_blocked')
  })

  it('falha em HIGH em qualquer categoria', async () => {
    const check = await run([
      { category: 'HARM_CATEGORY_HATE_SPEECH', probability: 'HIGH' },
    ])
    expect(check.pass).toBe(false)
    expect(check.details?.reason).toBe('high_probability')
  })

  it('falha em MEDIUM dentro de categoria estrita (sexual)', async () => {
    const check = await run([
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', probability: 'MEDIUM' },
    ])
    expect(check.pass).toBe(false)
    expect(check.details?.reason).toBe('medium_in_strict_category')
  })

  it('NÃO falha em MEDIUM em categoria não-estrita (hate speech)', async () => {
    const check = await run([
      { category: 'HARM_CATEGORY_HATE_SPEECH', probability: 'MEDIUM' },
      { category: 'HARM_CATEGORY_SEXUAL', probability: 'LOW' },
    ])
    expect(check.pass).toBe(true)
    expect(check.checked).toBe(true)
  })
})
