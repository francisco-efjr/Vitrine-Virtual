import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { _resetEnvCache } from '@/lib/env'
import { TryOnProviderError } from '../types'
import { googleAiProvider } from '../google-ai'

const ORIGINAL_ENV = { ...process.env }

const storageBucket = {
  upload: vi.fn(),
  createSignedUrl: vi.fn(),
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    storage: {
      from: vi.fn(() => storageBucket),
    },
  }),
}))

describe('googleAiProvider.generate', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, SUPABASE_SERVICE_ROLE_KEY: 'service-role-test' }
    _resetEnvCache()
    storageBucket.upload.mockReset()
    storageBucket.createSignedUrl.mockReset()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
    _resetEnvCache()
    vi.restoreAllMocks()
  })

  it('falha de forma clara quando GOOGLE_AI_API_KEY não está configurada', async () => {
    delete process.env.GOOGLE_AI_API_KEY
    _resetEnvCache()

    await expect(
      googleAiProvider.generate({
        modelImage: 'data:image/jpeg;base64,Y2xpZW50ZQ==',
        garmentImage: 'https://example.com/garment.jpg',
      }),
    ).rejects.toEqual(
      new TryOnProviderError('GOOGLE_AI_API_KEY não configurada para o Nano Banana', 'google', false),
    )
  })

  it('gera imagem com Nano Banana, salva no storage e retorna signed URL', async () => {
    process.env.GOOGLE_AI_API_KEY = 'google-test-key'
    process.env.GOOGLE_AI_MODEL = 'gemini-2.5-flash-image'
    _resetEnvCache()

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3, 4]), {
          status: 200,
          headers: { 'Content-Type': 'image/jpeg' },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      mimeType: 'image/png',
                      data: Buffer.from('generated-image').toString('base64'),
                    },
                  },
                ],
              },
            },
          ],
        }),
      )

    storageBucket.upload.mockResolvedValue({ error: null })
    storageBucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://cdn.example.com/result.png' },
      error: null,
    })

    const result = await googleAiProvider.generate({
      modelImage: `data:image/jpeg;base64,${Buffer.from('customer-image').toString('base64')}`,
      garmentImage: 'https://example.com/garment.jpg',
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://example.com/garment.jpg',
      expect.objectContaining({ cache: 'no-store' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-goog-api-key': 'google-test-key',
        }),
      }),
    )

    expect(storageBucket.upload).toHaveBeenCalledWith(
      expect.stringMatching(/\.png$/),
      expect.any(Buffer),
      expect.objectContaining({
        contentType: 'image/png',
        upsert: false,
      }),
    )
    expect(storageBucket.createSignedUrl).toHaveBeenCalledOnce()
    expect(result.resultUrl).toBe('https://cdn.example.com/result.png')
    expect(result.requestId).toBeTruthy()
  })
})
