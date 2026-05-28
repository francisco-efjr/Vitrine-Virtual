import { afterEach, describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { runAcceptanceChecks } from '..'
import * as garmentText from '../garment-text'

async function blank(): Promise<Buffer> {
  return sharp({
    create: { width: 800, height: 800, channels: 3, background: { r: 200, g: 200, b: 200 } },
  })
    .png()
    .toBuffer()
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('shouldRetry derived from check failures', () => {
  it('shouldRetry=false quando nenhum check retry-relevant falha', async () => {
    const res = await runAcceptanceChecks({
      customerImageBuffer: await blank(),
      garmentImageBuffer: Buffer.alloc(0),
      resultImageBuffer: await blank(),
    })
    // Nenhum check retry-relevant rodou ou todos passaram → shouldRetry=false
    expect(res.shouldRetry).toBe(false)
    expect(res.retryHints).toHaveLength(0)
  })

  it('shouldRetry=true quando garmentTextFidelity falha + hint contém STRICT', async () => {
    vi.spyOn(garmentText, 'detectGarmentText').mockResolvedValue({
      text: 'WRONG',
      hasText: true,
      source: 'gemini-vision',
    })
    const res = await runAcceptanceChecks({
      customerImageBuffer: await blank(),
      garmentImageBuffer: await blank(),
      resultImageBuffer: await blank(),
      garmentOcrText: 'NIKE',
    })
    expect(res.shouldRetry).toBe(true)
    expect(res.retryHints.some((h) => h.includes('STRICT') && h.toLowerCase().includes('text'))).toBe(
      true,
    )
  })
})
