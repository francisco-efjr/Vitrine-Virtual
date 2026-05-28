import { afterEach, describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { runAcceptanceChecks, type AcceptanceCheck } from '..'
import * as garmentText from '../garment-text'

async function blank(): Promise<Buffer> {
  return sharp({
    create: { width: 800, height: 800, channels: 3, background: { r: 200, g: 200, b: 200 } },
  })
    .png()
    .toBuffer()
}

function findCheck(checks: AcceptanceCheck[], name: string): AcceptanceCheck {
  return checks.find((c) => c.name === name)!
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('garmentTextFidelity (via runAcceptanceChecks)', () => {
  it('skip quando garment buffer está vazio e nenhum texto foi pré-OCRado', async () => {
    const result = await runAcceptanceChecks({
      customerImageBuffer: await blank(),
      garmentImageBuffer: Buffer.alloc(0),
      resultImageBuffer: await blank(),
    })
    const check = findCheck(result.checks, 'garmentTextFidelity')
    expect(check.checked).toBe(false)
    expect((check.details as { reason: string }).reason).toBe('no_garment_buffer')
  })

  it('skip quando OCR diz que a peça não tem texto', async () => {
    vi.spyOn(garmentText, 'detectGarmentText').mockResolvedValue({
      text: '',
      hasText: false,
      source: 'gemini-vision',
    })
    const result = await runAcceptanceChecks({
      customerImageBuffer: await blank(),
      garmentImageBuffer: await blank(),
      resultImageBuffer: await blank(),
      garmentOcrText: '',
    })
    const check = findCheck(result.checks, 'garmentTextFidelity')
    expect(check.checked).toBe(false)
    expect((check.details as { reason: string }).reason).toBe('no_text_on_garment')
  })

  it('pass quando texto da peça idêntico ao texto detectado no resultado', async () => {
    vi.spyOn(garmentText, 'detectGarmentText').mockResolvedValue({
      text: 'NIKE',
      hasText: true,
      source: 'gemini-vision',
    })
    const result = await runAcceptanceChecks({
      customerImageBuffer: await blank(),
      garmentImageBuffer: await blank(),
      resultImageBuffer: await blank(),
      garmentOcrText: 'NIKE',
    })
    const check = findCheck(result.checks, 'garmentTextFidelity')
    expect(check.checked).toBe(true)
    expect(check.pass).toBe(true)
    expect((check.details as { editDistance: number }).editDistance).toBe(0)
  })

  it('fail quando edit distance excede o máximo (default 1)', async () => {
    vi.spyOn(garmentText, 'detectGarmentText').mockResolvedValue({
      text: 'NIIKKE', // 3 edits de "NIKE"
      hasText: true,
      source: 'gemini-vision',
    })
    const result = await runAcceptanceChecks({
      customerImageBuffer: await blank(),
      garmentImageBuffer: await blank(),
      resultImageBuffer: await blank(),
      garmentOcrText: 'NIKE',
    })
    const check = findCheck(result.checks, 'garmentTextFidelity')
    expect(check.checked).toBe(true)
    expect(check.pass).toBe(false)
    expect((check.details as { editDistance: number }).editDistance).toBeGreaterThan(1)
  })

  it('graceful degradation: OCR do result indisponível → checked:false', async () => {
    vi.spyOn(garmentText, 'detectGarmentText').mockResolvedValue({
      text: '',
      hasText: false,
      source: 'unavailable',
      detail: 'no_api_key',
    })
    const result = await runAcceptanceChecks({
      customerImageBuffer: await blank(),
      garmentImageBuffer: await blank(),
      resultImageBuffer: await blank(),
      garmentOcrText: 'NIKE',
    })
    const check = findCheck(result.checks, 'garmentTextFidelity')
    expect(check.checked).toBe(false)
  })
})
