import { describe, expect, it } from 'vitest'
import { buildVirtualTryOnPrompt } from '../prompts/virtual-try-on-prompt'

describe('buildVirtualTryOnPrompt', () => {
  it('mantem o prompt branco como padrao', () => {
    const prompt = buildVirtualTryOnPrompt('white')

    expect(prompt).toContain('pure white studio background')
    expect(prompt).toContain('No background that is anything other than pure white')
    expect(prompt).not.toContain('BACKGROUND_IMAGE')
    expect(prompt).toContain('1. GARMENT_IMAGE')
    expect(prompt).toContain('2. CUSTOMER_PHOTO')
  })

  it('troca as regras de fundo quando a loja usa imagem personalizada', () => {
    const prompt = buildVirtualTryOnPrompt('custom')

    expect(prompt).toContain('2. BACKGROUND_IMAGE')
    expect(prompt).toContain('3. CUSTOMER_PHOTO')
    expect(prompt).toContain('Use BACKGROUND_IMAGE as the mandatory background reference')
    expect(prompt).toContain('Do not replace BACKGROUND_IMAGE with a pure white studio background')
    expect(prompt).not.toContain('Always use a pure white studio background')
    expect(prompt).not.toContain('No background that is anything other than pure white')
  })

  it('preserva o fundo do cliente sem exigir BACKGROUND_IMAGE', () => {
    const prompt = buildVirtualTryOnPrompt('preserve_customer')

    expect(prompt).toContain('Preserve the original background from CUSTOMER_PHOTO')
    expect(prompt).toContain('Do not replace the CUSTOMER_PHOTO background')
    expect(prompt).not.toContain('2. BACKGROUND_IMAGE')
    expect(prompt).not.toContain('Use BACKGROUND_IMAGE as the mandatory background reference')
    expect(prompt).not.toContain('Always use a pure white studio background')
  })
})
