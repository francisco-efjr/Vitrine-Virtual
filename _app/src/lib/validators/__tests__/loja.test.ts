import { describe, expect, it } from 'vitest'
import { lojaCreateSchema, nomeToSlug, slugSchema } from '../loja'

describe('slugSchema', () => {
  it.each([
    'atelier-laila',
    'closet-da-be',
    'studio-manu',
    'loja-123',
    'minha-loja-abc',
  ])('aceita slug válido %s', (slug) => {
    expect(slugSchema.parse(slug)).toBe(slug)
  })

  it.each([
    ['Atelier-Laila', 'maiúsculas'],
    ['atelier_laila', 'underscore'],
    ['atelier laila', 'espaço'],
    ['ate', 'curto demais é ok com 3 chars'],
    ['a', 'menos de 3 chars'],
    ['-atelier', 'começa com hífen'],
    ['atelier-', 'termina com hífen'],
    ['atelier--laila', 'hífen duplo'],
    ['atelier@laila', 'caractere especial'],
    ['atelier.com', 'ponto'],
  ])('rejeita slug inválido %s (%s)', (slug, _why) => {
    if (slug === 'ate') {
      expect(slugSchema.safeParse(slug).success).toBe(true)
      return
    }
    expect(slugSchema.safeParse(slug).success).toBe(false)
  })
})

describe('nomeToSlug', () => {
  it.each([
    ['Atelier Laila', 'atelier-laila'],
    ['Closet da Bê', 'closet-da-be'],
    ['Studio Manú', 'studio-manu'],
    ['Arara da Carol', 'arara-da-carol'],
    ['Açaí & Cia', 'acai-cia'],
    ['  Loja   espaços   ', 'loja-espacos'],
    ['LOJA EM CAIXA ALTA', 'loja-em-caixa-alta'],
    ['---loja---', 'loja'],
    ['São José dos Campos', 'sao-jose-dos-campos'],
  ])('normaliza "%s" para "%s"', (input, expected) => {
    expect(nomeToSlug(input)).toBe(expected)
  })

  it('trunca em 60 caracteres', () => {
    const longo = 'a'.repeat(100)
    expect(nomeToSlug(longo).length).toBeLessThanOrEqual(60)
  })
})

describe('lojaCreateSchema', () => {
  it('aceita payload válido', () => {
    const result = lojaCreateSchema.safeParse({
      nome: 'Atelier Laila',
      slug: 'atelier-laila',
      email: 'laila@atelier.com',
      cota_try_on_mensal: 200,
    })
    expect(result.success).toBe(true)
  })

  it('aplica default de cota', () => {
    const r = lojaCreateSchema.parse({
      nome: 'X',
      slug: 'xxx',
      email: 'a@b.com',
    })
    expect(r.cota_try_on_mensal).toBe(200)
  })

  it('normaliza e-mail para lowercase', () => {
    const r = lojaCreateSchema.parse({
      nome: 'X',
      slug: 'xxx',
      email: 'LAILA@Atelier.COM',
    })
    expect(r.email).toBe('laila@atelier.com')
  })

  it('rejeita e-mail inválido', () => {
    const result = lojaCreateSchema.safeParse({
      nome: 'X',
      slug: 'xxx',
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita nome vazio', () => {
    const r = lojaCreateSchema.safeParse({
      nome: '   ',
      slug: 'xxx',
      email: 'a@b.com',
    })
    expect(r.success).toBe(false)
  })
})
