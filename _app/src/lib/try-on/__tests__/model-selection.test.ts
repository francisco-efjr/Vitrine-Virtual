import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { _resetEnvCache } from '@/lib/env'
import {
  AI_IMAGE_MODEL_LABEL,
  DEFAULT_AI_IMAGE_MODEL,
  isAiImageModel,
  resolveGoogleModel,
} from '../model-selection'

const ORIGINAL_ENV = { ...process.env }

describe('model-selection (pure)', () => {
  it('DEFAULT_AI_IMAGE_MODEL é medium (igual ao mock do design e ao GA atual)', () => {
    expect(DEFAULT_AI_IMAGE_MODEL).toBe('medium')
  })

  it('isAiImageModel', () => {
    expect(isAiImageModel('high')).toBe(true)
    expect(isAiImageModel('medium')).toBe(true)
    expect(isAiImageModel('low')).toBe(false)
    expect(isAiImageModel(null)).toBe(false)
  })

  it('labels não expõem nome técnico', () => {
    expect(AI_IMAGE_MODEL_LABEL.high).toBe('High')
    expect(AI_IMAGE_MODEL_LABEL.medium).toBe('Medium')
  })
})

describe('resolveGoogleModel', () => {
  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      SUPABASE_SERVICE_ROLE_KEY: 'svc',
      GOOGLE_AI_MODEL: 'gemini-3.1-flash-image-preview',
      GOOGLE_AI_FALLBACK_MODEL: 'gemini-2.5-flash-image',
    }
    _resetEnvCache()
  })
  afterEach(() => {
    process.env = ORIGINAL_ENV
    _resetEnvCache()
  })

  it('high → GOOGLE_AI_MODEL', () => {
    expect(resolveGoogleModel('high')).toBe('gemini-3.1-flash-image-preview')
  })
  it('medium → GOOGLE_AI_FALLBACK_MODEL', () => {
    expect(resolveGoogleModel('medium')).toBe('gemini-2.5-flash-image')
  })
  it('null/indefinido cai no default de plataforma (medium)', () => {
    expect(resolveGoogleModel(null)).toBe('gemini-2.5-flash-image')
    expect(resolveGoogleModel(undefined)).toBe('gemini-2.5-flash-image')
  })
})
