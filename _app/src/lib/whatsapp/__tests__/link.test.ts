import { describe, expect, it } from 'vitest'
import { buildVitrineMessage, buildWhatsAppUrl, normalizePhoneToWaMe } from '../link'

describe('normalizePhoneToWaMe', () => {
  it.each([
    ['11998765432', '5511998765432'],            // celular sem DDI
    ['(11) 99876-5432', '5511998765432'],         // celular formatado
    ['+55 11 99876-5432', '5511998765432'],       // com DDI
    ['5511998765432', '5511998765432'],           // já normalizado
    ['1133334444', '551133334444'],               // fixo 10 dígitos
  ])('normaliza %s para %s', (input, expected) => {
    expect(normalizePhoneToWaMe(input)).toBe(expected)
  })

  it('retorna null para vazio ou número curto demais', () => {
    expect(normalizePhoneToWaMe('')).toBeNull()
    expect(normalizePhoneToWaMe('123')).toBeNull()
  })
})

describe('buildWhatsAppUrl', () => {
  it('gera URL sem mensagem', () => {
    expect(buildWhatsAppUrl('11998765432')).toBe('https://wa.me/5511998765432')
  })
  it('gera URL com mensagem encodada', () => {
    const url = buildWhatsAppUrl('11998765432', 'Olá, tudo bem?')
    expect(url).toContain('https://wa.me/5511998765432?text=')
    expect(url).toContain(encodeURIComponent('Olá, tudo bem?'))
  })
  it('retorna null para telefone inválido', () => {
    expect(buildWhatsAppUrl('xx')).toBeNull()
  })
})

describe('buildVitrineMessage', () => {
  it('inclui o nome da peça', () => {
    expect(buildVitrineMessage({ pecaNome: 'Blusa de Linho' })).toContain('"Blusa de Linho"')
  })
  it('fallback para nome da loja', () => {
    expect(buildVitrineMessage({ lojaNome: 'Atelier Laila' })).toContain('Atelier Laila')
  })
  it('fallback genérico', () => {
    expect(buildVitrineMessage({})).toBe(
      'Olá! Vi sua vitrine e gostaria de mais informações.',
    )
  })
})
