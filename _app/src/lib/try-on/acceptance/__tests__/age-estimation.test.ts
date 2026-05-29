import { describe, expect, it } from 'vitest'
import { requiresParentalConsent } from '../age-estimation'

describe('requiresParentalConsent', () => {
  it('minor com confidence ≥ 0.5 → true', () => {
    expect(
      requiresParentalConsent({
        bracket: 'minor',
        confidence: 0.5,
        source: 'gemini-vision',
      }),
    ).toBe(true)
    expect(
      requiresParentalConsent({
        bracket: 'minor',
        confidence: 0.9,
        source: 'gemini-vision',
      }),
    ).toBe(true)
  })

  it('minor com confidence < 0.5 → false (estimador pouco confiante)', () => {
    expect(
      requiresParentalConsent({
        bracket: 'minor',
        confidence: 0.4,
        source: 'gemini-vision',
      }),
    ).toBe(false)
  })

  it('uncertain com confidence ≥ 0.7 → true (caso fronteiriço bem identificado)', () => {
    expect(
      requiresParentalConsent({
        bracket: 'uncertain',
        confidence: 0.7,
        source: 'gemini-vision',
      }),
    ).toBe(true)
  })

  it('uncertain com confidence < 0.7 → false', () => {
    expect(
      requiresParentalConsent({
        bracket: 'uncertain',
        confidence: 0.5,
        source: 'gemini-vision',
      }),
    ).toBe(false)
  })

  it('adult sempre → false', () => {
    expect(
      requiresParentalConsent({
        bracket: 'adult',
        confidence: 1.0,
        source: 'gemini-vision',
      }),
    ).toBe(false)
  })

  it('source unavailable → false (fail-safe: não bloqueia em erro de infra)', () => {
    expect(
      requiresParentalConsent({
        bracket: 'minor',
        confidence: 1.0,
        source: 'unavailable',
        detail: 'no_api_key',
      }),
    ).toBe(false)
  })
})
