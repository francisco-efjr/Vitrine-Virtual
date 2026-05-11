import { describe, expect, it } from 'vitest'
import {
  centavosToPrecoString,
  fotoBase64UploadSchema,
  formatPreco,
  pecaCreateSchema,
  pecaUpdateSchema,
  precoStringToCentavos,
} from '../peca'

describe('precoStringToCentavos', () => {
  it.each([
    ['89,90', 8990],
    ['89.90', 8990],
    ['149', 14900],
    ['0,01', 1],
    ['1.234,56', 123456],
    ['', null],
    ['   ', null],
  ])('converte "%s" para %s centavos', (input, expected) => {
    expect(precoStringToCentavos(input)).toBe(expected)
  })

  it('lança erro para preço negativo', () => {
    expect(() => precoStringToCentavos('-10')).toThrow()
  })

  it('lança erro para texto não-numérico', () => {
    expect(() => precoStringToCentavos('abc')).toThrow()
  })
})

describe('centavosToPrecoString', () => {
  it.each([
    [8990, '89,90'],
    [14900, '149,00'],
    [1, '0,01'],
    [null, ''],
    [undefined, ''],
  ])('converte %s centavos para "%s"', (input, expected) => {
    expect(centavosToPrecoString(input as number | null)).toBe(expected)
  })
})

describe('formatPreco', () => {
  it('formata para BRL', () => {
    expect(formatPreco(8990).replace(/ /g, ' ')).toBe('R$ 89,90')
  })
  it('retorna vazio para null/undefined', () => {
    expect(formatPreco(null)).toBe('')
    expect(formatPreco(undefined)).toBe('')
  })
})

describe('pecaCreateSchema', () => {
  it('aceita peça mínima', () => {
    expect(
      pecaCreateSchema.safeParse({ nome: 'Blusa branca', status: 'disponivel' }).success,
    ).toBe(true)
  })
  it('aplica default de status', () => {
    const r = pecaCreateSchema.parse({ nome: 'X' })
    expect(r.status).toBe('disponivel')
  })
  it('rejeita nome > 100 chars', () => {
    expect(pecaCreateSchema.safeParse({ nome: 'a'.repeat(101) }).success).toBe(false)
  })
  it('rejeita preço negativo', () => {
    expect(
      pecaCreateSchema.safeParse({ nome: 'X', preco_centavos: -1 }).success,
    ).toBe(false)
  })
})

describe('pecaUpdateSchema', () => {
  it('NÃO injeta default de status no update — peça vendida fica vendida', () => {
    // Regressão: antes, pecaCreateSchema.partial() preservava `.default('disponivel')`,
    // e qualquer PATCH /api/pecas/[id] sem campo status silenciosamente reabria
    // peças vendidas. Veja registro em tests/qa/bugs.md.
    const result = pecaUpdateSchema.parse({ nome: 'Blusa atualizada' })
    expect(result).not.toHaveProperty('status')
  })

  it('aceita status explícito quando enviado', () => {
    const result = pecaUpdateSchema.parse({ status: 'vendida' })
    expect(result.status).toBe('vendida')
  })

  it('mantém demais campos opcionais', () => {
    expect(pecaUpdateSchema.safeParse({}).success).toBe(true)
  })
})

describe('fotoBase64UploadSchema', () => {
  it('aceita data URL base64 de imagem válida', () => {
    expect(
      fotoBase64UploadSchema.safeParse({
        action: 'upload_base64',
        filename: 'camisa.jpg',
        contentType: 'image/jpeg',
        size: 128,
        ordem: 0,
        data_url: 'data:image/jpeg;base64,ZmFrZS1pbWFnZS1ieXRlcw==',
      }).success,
    ).toBe(true)
  })

  it('rejeita data URL com mime inválido', () => {
    expect(
      fotoBase64UploadSchema.safeParse({
        action: 'upload_base64',
        filename: 'camisa.gif',
        contentType: 'image/png',
        size: 128,
        ordem: 0,
        data_url: 'data:image/gif;base64,ZmFrZQ==',
      }).success,
    ).toBe(false)
  })
})
