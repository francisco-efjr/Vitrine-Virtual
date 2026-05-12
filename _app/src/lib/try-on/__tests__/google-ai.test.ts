import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { _resetEnvCache } from '@/lib/env'
import { normalizeTryOnResultComposition } from '../image-composition'
import { TryOnProviderError, type TryOnProviderInput } from '../types'
import { googleAiProvider } from '../google-ai'

const ORIGINAL_ENV = { ...process.env }

const storageBucket = {
  upload: vi.fn(),
  download: vi.fn(),
  createSignedUrl: vi.fn(),
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    storage: {
      from: vi.fn(() => storageBucket),
    },
  }),
}))

vi.mock('../image-composition', () => ({
  inspectImageBuffer: vi.fn(async (buf: Buffer) => ({
    width: 864,
    height: 1184,
    format: 'jpeg',
    sizeBytes: buf.byteLength,
  })),
  normalizeTryOnResultComposition: vi.fn(async (buf: Buffer) => ({
    buffer: buf,
    cropped: false,
    original: { width: 864, height: 1184, format: 'jpeg', sizeBytes: buf.byteLength },
    output: { width: 864, height: 1184, format: 'jpeg', sizeBytes: buf.byteLength },
  })),
}))

// Sharp is used to resize images; mock it so tests don't need real image buffers.
vi.mock('sharp', () => {
  const sharpInstance = {
    resize() {
      return sharpInstance
    },
    jpeg() {
      return sharpInstance
    },
    metadata: async () => ({ width: 864, height: 1184, format: 'jpeg' }),
    toBuffer: async () => Buffer.from('resized-image'),
  }
  return { default: () => sharpInstance }
})

const SINGLE_PHOTO_INPUT: TryOnProviderInput = {
  customer: {
    photoImage: `data:image/jpeg;base64,${Buffer.from('customer-photo').toString('base64')}`,
  },
  references: {
    customerReferenceImage: `data:image/jpeg;base64,${Buffer.from('customer-photo').toString('base64')}`,
  },
  product: {
    productImage: 'https://example.com/garment.jpg',
  },
  background: {
    mode: 'white',
  },
}

describe('googleAiProvider.generate', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, SUPABASE_SERVICE_ROLE_KEY: 'service-role-test' }
    _resetEnvCache()
    storageBucket.upload.mockReset()
    storageBucket.download.mockReset()
    storageBucket.createSignedUrl.mockReset()
    vi.mocked(normalizeTryOnResultComposition).mockClear()
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
    storageBucket.download.mockResolvedValue({
      data: {
        arrayBuffer: async () => new Uint8Array([5, 6, 7, 8]).buffer,
      },
      error: null,
    })
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
    // Gemini 2.5 Flash Image accepts explicit aspect ratio but not imageSize.
    expect(requestBody.generationConfig.imageConfig).toEqual({
      aspectRatio: '3:4',
    })
    expect(requestBody.generationConfig).not.toHaveProperty('responseFormat')
    expect(requestBody.generationConfig.imageConfig).not.toHaveProperty('imageSize')

    expect(storageBucket.upload).toHaveBeenCalledWith(
      expect.stringMatching(/\.jpg$/),
      expect.any(Buffer),
      expect.objectContaining({
        contentType: 'image/jpeg',
        upsert: false,
      }),
    )
    expect(storageBucket.download).toHaveBeenCalledOnce()
    expect(storageBucket.createSignedUrl).toHaveBeenCalledOnce()
    expect(result.resultUrl).toBe('https://cdn.example.com/result.jpg')
    expect(result.requestId).toBeTruthy()
    expect(normalizeTryOnResultComposition).toHaveBeenCalledOnce()
  })

  it('envia o fundo personalizado da loja como terceira imagem para o Gemini', async () => {
    process.env.GOOGLE_AI_API_KEY = 'google-test-key'
    process.env.GOOGLE_AI_MODEL = 'gemini-2.5-flash-image'
    _resetEnvCache()

    const customInput: TryOnProviderInput = {
      ...SINGLE_PHOTO_INPUT,
      background: {
        mode: 'custom',
        backgroundImage: 'https://example.com/store-background.webp',
      },
    }

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      // garment download
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3, 4]), {
          status: 200,
          headers: { 'Content-Type': 'image/jpeg' },
        }),
      )
      // store background download
      .mockResolvedValueOnce(
        new Response(new Uint8Array([9, 8, 7, 6]), {
          status: 200,
          headers: { 'Content-Type': 'image/webp' },
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
    storageBucket.download.mockResolvedValue({
      data: {
        arrayBuffer: async () => new Uint8Array([5, 6, 7, 8]).buffer,
      },
      error: null,
    })
    storageBucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://cdn.example.com/result.jpg' },
      error: null,
    })

    await googleAiProvider.generate(customInput)

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://example.com/store-background.webp',
      expect.objectContaining({ cache: 'no-store' }),
    )

    const requestBody = JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))
    const parts = requestBody.contents[0].parts
    expect(parts).toHaveLength(7)
    expect(parts[0]?.text).toContain('BACKGROUND_IMAGE')
    expect(parts[0]?.text).not.toContain('Always use a pure white studio background')
    expect(parts[5]?.text).toContain('BACKGROUND_IMAGE')
    expect(parts[6]?.inlineData).toEqual(
      expect.objectContaining({
        mimeType: 'image/jpeg',
        data: expect.any(String),
      }),
    )
    expect(normalizeTryOnResultComposition).not.toHaveBeenCalled()
  })

  it('pula Imagen configurado como primário e usa fallback Gemini compatível', async () => {
    process.env.GOOGLE_AI_API_KEY = 'google-test-key'
    process.env.GOOGLE_AI_MODEL = 'imagen-4.0-ultra-generate-001'
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
    storageBucket.download.mockResolvedValue({
      data: {
        arrayBuffer: async () => new Uint8Array([5, 6, 7, 8]).buffer,
      },
      error: null,
    })
    storageBucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://cdn.example.com/result.jpg' },
      error: null,
    })

    await googleAiProvider.generate(SINGLE_PHOTO_INPUT)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('envia imageSize apenas para modelos Gemini de alta resolução compatíveis', async () => {
    process.env.GOOGLE_AI_API_KEY = 'google-test-key'
    process.env.GOOGLE_AI_MODEL = 'gemini-3-pro-image-preview'
    process.env.GOOGLE_AI_IMAGE_SIZE = '2K'
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
    storageBucket.download.mockResolvedValue({
      data: {
        arrayBuffer: async () => new Uint8Array([5, 6, 7, 8]).buffer,
      },
      error: null,
    })
    storageBucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://cdn.example.com/result.jpg' },
      error: null,
    })

    await googleAiProvider.generate(SINGLE_PHOTO_INPUT)

    const requestBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))
    expect(requestBody.generationConfig.imageConfig).toEqual({
      aspectRatio: '3:4',
      imageSize: '2K',
    })
  })
})
