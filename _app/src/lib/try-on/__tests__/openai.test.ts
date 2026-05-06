import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { _resetEnvCache } from '@/lib/env'
import { TryOnProviderError } from '../types'
import { openAiProvider } from '../openai'

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

describe('openAiProvider.generate', () => {
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

  it('falha de forma clara quando OPENAI_API_KEY não está configurada', async () => {
    delete process.env.OPENAI_API_KEY
    _resetEnvCache()

    await expect(openAiProvider.generate(SINGLE_PHOTO_INPUT)).rejects.toEqual(
      new TryOnProviderError('OPENAI_API_KEY não configurada', 'openai', false),
    )
  })

  it('gera imagem, salva no storage e retorna signed URL', async () => {
    process.env.OPENAI_API_KEY = 'openai-test-key'
    process.env.OPENAI_IMAGE_MODEL = 'gpt-image-1'
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
      // OpenAI images/edits
      .mockResolvedValueOnce(
        Response.json({
          data: [{ b64_json: Buffer.from('generated-image').toString('base64') }],
        }),
      )

    storageBucket.upload.mockResolvedValue({ error: null })
    storageBucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://cdn.example.com/result.png' },
      error: null,
    })

    const result = await openAiProvider.generate(SINGLE_PHOTO_INPUT)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://example.com/garment.jpg',
      expect.objectContaining({ cache: 'no-store' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.openai.com/v1/images/edits',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer openai-test-key',
        }),
        body: expect.any(FormData),
      }),
    )

    const requestBody = fetchMock.mock.calls[1]?.[1]?.body as FormData
    const images = requestBody.getAll('image[]') as File[]
    // 2 images: customer-photo + garment (no more body/selfie split)
    expect(images).toHaveLength(2)
    expect(images.map((image) => image.name)).toEqual(['customer-photo.jpg', 'garment-image.jpg'])
    expect(requestBody.get('prompt')).toBeTruthy()

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
