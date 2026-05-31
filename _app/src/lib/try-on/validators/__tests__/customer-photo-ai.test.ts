import { beforeEach, describe, expect, it, vi } from 'vitest'
import { _resetEnvCache } from '@/lib/env'
import { validateCustomerPhotoWithAi } from '../customer-photo-ai'
import type { CustomerPhotoSignals } from '@/lib/try-on/quality-gate'

const clearVerdict = {
  has_face: true,
  face_clarity: 'clear',
  person_count: 1,
  body_visibility: 'upper_body',
  image_quality: 'good',
}

function mockGeminiVerdict(verdict: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(verdict) }],
            },
          },
        ],
      }),
    ),
  )
}

const visibleClientSignals: CustomerPhotoSignals = {
  shortestSidePx: 1024,
  meanLuminance: 120,
  sharpness: 160,
  personCount: 1,
  faceVisible: true,
  faceAreaFraction: 0.04,
  fullBodyLandmarksOk: true,
  poseUpright: true,
  targetRegionUnoccluded: 0.9,
  detectedType: 'full_body',
}

describe('validateCustomerPhotoWithAi', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    process.env.GOOGLE_AI_API_KEY = 'google-key'
    delete process.env.TRY_ON_FACE_VALIDATION_MODEL
    _resetEnvCache()
  })

  it('aprova foto claramente válida sem warning', async () => {
    mockGeminiVerdict(clearVerdict)

    const result = await validateCustomerPhotoWithAi(Buffer.from('img'), 'image/jpeg', null)

    expect(result.valid).toBe(true)
    expect(result.severity).toBe('pass')
    expect(result.reason).toBeUndefined()
  })

  it('transforma rosto/corpo pouco aparentes em aviso continuável', async () => {
    mockGeminiVerdict({
      ...clearVerdict,
      face_clarity: 'partial',
      body_visibility: 'head_only',
    })

    const result = await validateCustomerPhotoWithAi(Buffer.from('img'), 'image/jpeg', null)

    expect(result.valid).toBe(false)
    expect(result.severity).toBe('soft_warning')
    expect(result.reason).toBe('uncertain')
  })

  it('bloqueia hard quando não há rosto visível', async () => {
    mockGeminiVerdict({
      ...clearVerdict,
      has_face: false,
      face_clarity: 'none',
    })

    const result = await validateCustomerPhotoWithAi(Buffer.from('img'), 'image/jpeg', null)

    expect(result.valid).toBe(false)
    expect(result.severity).toBe('hard_reject')
    expect(result.reason).toBe('no_face')
  })

  it('downgradeia falso sem-rosto para aviso quando o cliente viu face', async () => {
    mockGeminiVerdict({
      ...clearVerdict,
      has_face: false,
      face_clarity: 'none',
    })

    const result = await validateCustomerPhotoWithAi(
      Buffer.from('img'),
      'image/jpeg',
      visibleClientSignals,
    )

    expect(result.valid).toBe(false)
    expect(result.severity).toBe('soft_warning')
    expect(result.reason).toBe('uncertain')
  })
})
