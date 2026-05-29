import { describe, expect, it } from 'vitest'
import { categoriesConflict } from '../conflicting-garment-detect'

describe('categoriesConflict', () => {
  it('mesma categoria → conflito', () => {
    expect(categoriesConflict(['tops'], 'tops')).toBe(true)
    expect(categoriesConflict(['bottoms'], 'bottoms')).toBe(true)
  })

  it('categorias diferentes → sem conflito', () => {
    expect(categoriesConflict(['tops'], 'bottoms')).toBe(false)
    expect(categoriesConflict(['accessories'], 'tops')).toBe(false)
  })

  it('cliente vestindo top+bottom, nova é one-piece → conflito', () => {
    expect(categoriesConflict(['tops', 'bottoms'], 'one-pieces')).toBe(true)
  })

  it('cliente vestindo one-piece, nova é top OU bottom → conflito', () => {
    expect(categoriesConflict(['one-pieces'], 'tops')).toBe(true)
    expect(categoriesConflict(['one-pieces'], 'bottoms')).toBe(true)
  })

  it('cliente vestindo one-piece, nova é outerwear → sem conflito (layering OK)', () => {
    expect(categoriesConflict(['one-pieces'], 'outerwear')).toBe(false)
  })

  it('outfit vazio → sem conflito', () => {
    expect(categoriesConflict([], 'tops')).toBe(false)
  })

  it('accessories são não-conflitantes com qualquer categoria', () => {
    expect(categoriesConflict(['accessories'], 'tops')).toBe(false)
    expect(categoriesConflict(['accessories'], 'one-pieces')).toBe(false)
  })

  it('múltiplas categorias atuais, alguma conflita → conflito', () => {
    expect(categoriesConflict(['tops', 'accessories'], 'tops')).toBe(true)
  })
})
