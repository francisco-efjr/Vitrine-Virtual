import { describe, expect, it } from 'vitest'
import { inferSensitiveGarmentCategory } from '../use-case'

describe('inferSensitiveGarmentCategory', () => {
  it('null/undefined → null', () => {
    expect(inferSensitiveGarmentCategory(null)).toBeNull()
    expect(inferSensitiveGarmentCategory(undefined)).toBeNull()
    expect(inferSensitiveGarmentCategory('')).toBeNull()
  })

  it('swimwear terms (PT)', () => {
    expect(inferSensitiveGarmentCategory('Biquíni')).toBe('swimwear')
    expect(inferSensitiveGarmentCategory('biquini-listrado')).toBe('swimwear')
    expect(inferSensitiveGarmentCategory('sunga')).toBe('swimwear')
    expect(inferSensitiveGarmentCategory('Maiô')).toBe('swimwear')
    expect(inferSensitiveGarmentCategory('roupa de praia')).toBe('swimwear')
  })

  it('swimwear terms (EN)', () => {
    expect(inferSensitiveGarmentCategory('swimwear-bottoms')).toBe('swimwear')
    expect(inferSensitiveGarmentCategory('bikini')).toBe('swimwear')
  })

  it('underwear terms', () => {
    expect(inferSensitiveGarmentCategory('lingerie')).toBe('underwear')
    expect(inferSensitiveGarmentCategory('Calcinha')).toBe('underwear')
    expect(inferSensitiveGarmentCategory('Sutiã rendado')).toBe('underwear')
    expect(inferSensitiveGarmentCategory('cueca-boxer')).toBe('underwear')
    expect(inferSensitiveGarmentCategory('moda íntima')).toBe('underwear')
  })

  it('categorias não-sensíveis → null', () => {
    expect(inferSensitiveGarmentCategory('blusa')).toBeNull()
    expect(inferSensitiveGarmentCategory('calca-jeans')).toBeNull()
    expect(inferSensitiveGarmentCategory('vestido')).toBeNull()
    expect(inferSensitiveGarmentCategory('jaqueta')).toBeNull()
  })

  it('case insensitive', () => {
    expect(inferSensitiveGarmentCategory('BIQUÍNI')).toBe('swimwear')
    expect(inferSensitiveGarmentCategory('LINGERIE')).toBe('underwear')
  })
})
