import { describe, expect, it } from 'vitest'
import { fabricPromptClause } from '../fabric-classify'

describe('fabricPromptClause', () => {
  it('retorna string vazia pra unknown fabric', () => {
    expect(fabricPromptClause('unknown', 0.99)).toBe('')
  })

  it('retorna string vazia quando confidence < 0.6', () => {
    expect(fabricPromptClause('leather', 0.5)).toBe('')
    expect(fabricPromptClause('silk', 0.59)).toBe('')
  })

  it('retorna cláusula pra leather quando confidence ≥ 0.6', () => {
    const clause = fabricPromptClause('leather', 0.6)
    expect(clause).toContain('FABRIC: leather')
    expect(clause.toLowerCase()).toContain('sheen')
  })

  it('cláusula descreve drape/textura por fabric', () => {
    expect(fabricPromptClause('silk', 0.9).toLowerCase()).toContain('fluid drape')
    expect(fabricPromptClause('denim', 0.9).toLowerCase()).toContain('twill')
    expect(fabricPromptClause('knit', 0.9).toLowerCase()).toContain('stitch')
    expect(fabricPromptClause('velvet', 0.9).toLowerCase()).toContain('pile')
  })

  it('todos os fabrics válidos têm cláusula não-vazia', () => {
    const fabrics = [
      'leather',
      'silk',
      'denim',
      'knit',
      'cotton',
      'wool',
      'satin',
      'velvet',
      'linen',
      'synthetic',
    ] as const
    for (const f of fabrics) {
      expect(fabricPromptClause(f, 0.8).length).toBeGreaterThan(20)
    }
  })
})
