import { describe, expect, it } from 'vitest'
import { editDistance } from '../garment-text'

describe('editDistance', () => {
  it('strings idênticas → 0', () => {
    expect(editDistance('NIKE', 'NIKE')).toBe(0)
  })

  it('case-insensitive', () => {
    expect(editDistance('Nike', 'NIKE')).toBe(0)
  })

  it('trim whitespace nas pontas', () => {
    expect(editDistance(' NIKE ', 'NIKE')).toBe(0)
  })

  it('1 substituição', () => {
    expect(editDistance('NIKE', 'MIKE')).toBe(1)
  })

  it('1 inserção', () => {
    expect(editDistance('NIKE', 'NIKES')).toBe(1)
  })

  it('1 deleção', () => {
    expect(editDistance('NIKES', 'NIKE')).toBe(1)
  })

  it('strings completamente diferentes', () => {
    expect(editDistance('NIKE', 'PUMA')).toBe(4)
  })

  it('uma string vazia', () => {
    expect(editDistance('', 'NIKE')).toBe(4)
    expect(editDistance('NIKE', '')).toBe(4)
  })

  it('ambas vazias → 0', () => {
    expect(editDistance('', '')).toBe(0)
  })

  it('texto longo (sentenças)', () => {
    // "Just Do It" vs "Just Did It" = 2 substituições (o→i, i→ )
    expect(editDistance('Just Do It', 'Just Did It')).toBe(2)
  })
})
