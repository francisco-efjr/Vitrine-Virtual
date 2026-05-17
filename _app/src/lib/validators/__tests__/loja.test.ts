import { describe, expect, it } from 'vitest'
import {
  lojaCreateSchema,
  lojaUpdateSchema,
  nomeToSlug,
  sanitizeSlug,
  slugSchema,
  trimSlugHyphens,
  validateSlug,
} from '../loja'

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

describe('sanitizeSlug (digitação no campo, por tecla)', () => {
  it('minúsculas, sem acento, só [a-z0-9-]', () => {
    expect(sanitizeSlug('Studio Manú!')).toBe('studio-manu-')
  })
  it('colapsa hífens duplicados mas NÃO apara as pontas (não trava o input)', () => {
    expect(sanitizeSlug('a--b')).toBe('a-b')
    expect(sanitizeSlug('-ate')).toBe('-ate')
    expect(sanitizeSlug('ate-')).toBe('ate-')
  })
  it('lida com string vazia', () => {
    expect(sanitizeSlug('')).toBe('')
  })
})

describe('trimSlugHyphens', () => {
  it('apara hífens das pontas (blur/save)', () => {
    expect(trimSlugHyphens('-studio-manu-')).toBe('studio-manu')
    expect(trimSlugHyphens('studio-manu')).toBe('studio-manu')
  })
})

describe('validateSlug (mensagens da UI)', () => {
  it('ok para slug válido', () => {
    expect(validateSlug('studio-manu')).toEqual({ ok: true, msg: '' })
  })
  it.each([
    ['', 'vazio'],
    ['ab', 'curto'],
    ['-abc', 'começa com hífen'],
    ['abc-', 'termina com hífen'],
    ['admin', 'reservado'],
    ['vitrine', 'reservado'],
  ])('rejeita "%s" (%s)', (slug) => {
    expect(validateSlug(slug).ok).toBe(false)
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

  it('aplica default de modelo IA = medium', () => {
    const r = lojaCreateSchema.parse({
      nome: 'X',
      slug: 'xxx',
      email: 'a@b.com',
    })
    expect(r.ai_image_model).toBe('medium')
  })

  it('aceita ai_image_model high', () => {
    const r = lojaCreateSchema.parse({
      nome: 'X',
      slug: 'xxx',
      email: 'a@b.com',
      ai_image_model: 'high',
    })
    expect(r.ai_image_model).toBe('high')
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

describe('lojaUpdateSchema', () => {
  it('normaliza instagram e tiktok removendo @', () => {
    const result = lojaUpdateSchema.parse({
      instagram: '@atelier.laila',
      tiktok: '@atelier_laila',
    })

    expect(result.instagram).toBe('atelier.laila')
    expect(result.tiktok).toBe('atelier_laila')
  })

  it('mantém mensagem clara quando WhatsApp não está em E.164', () => {
    const result = lojaUpdateSchema.safeParse({
      whatsapp_e164: '5511999999999',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/\+5511/)
    }
  })
})
