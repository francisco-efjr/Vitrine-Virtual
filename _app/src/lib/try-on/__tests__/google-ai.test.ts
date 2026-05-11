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

// Sharp is used to resize images; mock it so tests don't need real image buffers.
vi.mock('sharp', () => {
  const sharpInstance = {
    resize() { return sharpInstance },
    jpeg() { return sharpInstance },
    toBuffer: async () => Buffer.from('resized-image'),
  }
  return { default: () => sharpInstance }
})

const SINGLE_PHOTO_INPUT = {
  customer: {
    photoImage: `data:image/jpeg;base64,${Buffer.from('customer-photo').toString('base64')}`,
  },
  references: {
    customerReferenceImage: `data:image/jpeg;base64,${Buffer.from('customer-photo').toString('base64')}`,
  },
  product: {
    productImage: 'https://example.com/garment.jpg',
  },
}

describe('googleAiProvider.generate', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, SUPABASE_SERVICE_ROLE_KEY: 'service-role-test' }
    _resetEnvCache()
    storageBucket.upload.mockReset()
    storageBucket.createSignedUrl.mockReset()
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
    _resetEnvCache()
    vi.restoreAllMocks()
  })

  it('falha de forma clara quando GOOGLE_AI_API_KEY não está configurada', async () => {
    delete process.env.GOOGLE_AI_API_KEY
    _resetEnvCache()

    await expect(googleAiProvider.generate(SINGLE_PHOTO_INPUT)).rejects.toEqual(
      new TryOnProviderError(
        'GOOGLE_AI_API_KEY não configurada para o Nano Banana',
        'google',
        false,
      ),
    )
  })

  it('gera imagem com Nano Banana, salva no storage e retorna signed URL', async () => {
    process.env.GOOGLE_AI_API_KEY = 'google-test-key'
    process.env.GOOGLE_AI_MODEL = 'gemini-2.5-flash-image'
    _resetEnvCache()

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      // garment download
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3, 4]), {
          status: 200,
          headers: { 'Content-Type': 'image/jpeg' },
        }),
      )
      // Gemini API response
      .mockResolvedValueOnce(
        Response.json({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      mimeType: 'image/jpeg',
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
      data: { signedUrl: 'https://cdn.example.com/result.jpg' },
      error: null,
    })

    const result = await googleAiProvider.generate(SINGLE_PHOTO_INPUT)

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

    const requestBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))
    const parts = requestBody.contents[0].parts
    // 5 parts: prompt text, CUSTOMER_PHOTO label, customer image, GARMENT_IMAGE label, garment image
    expect(parts).toHaveLength(5)
    expect(parts[1]?.text).toContain('CUSTOMER_PHOTO')
    expect(parts[3]?.text).toContain('GARMENT_IMAGE')
    // Default config = maior tamanho disponível + ratio fashion. Garante que
    // qualquer regressão que troque o default seja pega no CI.
    expect(requestBody.generationConfig.imageConfig).toEqual({
      imageSize: '4K',
      aspectRatio: '3:4',
    })

    expect(storageBucket.upload).toHaveBeenCalledWith(
      expect.stringMatching(/\.jpg$/),
      expect.any(Buffer),
      expect.objectContaining({
        contentType: 'image/jpeg',
        upsert: false,
      }),
    )
    expect(storageBucket.createSignedUrl).toHaveBeenCalledOnce()
    expect(result.resultUrl).toBe('https://cdn.example.com/result.jpg')
    expect(result.requestId).toBeTruthy()
  })
})
