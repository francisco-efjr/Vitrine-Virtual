import { describe, expect, it } from 'vitest'
import { checkPassword, PASSWORD_MIN_LENGTH } from '../password-rules'

describe('checkPassword', () => {
  it('senha vazia falha em tudo', () => {
    const r = checkPassword('', '')
    expect(r.hasMin).toBe(false)
    expect(r.hasUpper).toBe(false)
    expect(r.hasNum).toBe(false)
    expect(r.matches).toBe(false)
    expect(r.valid).toBe(false)
  })

  it(`exige mínimo ${PASSWORD_MIN_LENGTH} caracteres`, () => {
    expect(checkPassword('A1abcde', 'A1abcde').hasMin).toBe(false) // 7
    expect(checkPassword('A1abcdef', 'A1abcdef').hasMin).toBe(true) // 8
  })

  it('exige letra maiúscula', () => {
    expect(checkPassword('abc12345', 'abc12345').hasUpper).toBe(false)
    expect(checkPassword('Abc12345', 'Abc12345').hasUpper).toBe(true)
  })

  it('exige número', () => {
    expect(checkPassword('AbcDefgh', 'AbcDefgh').hasNum).toBe(false)
    expect(checkPassword('Abcdefg1', 'Abcdefg1').hasNum).toBe(true)
  })

  it('exige confirmação igual', () => {
    expect(checkPassword('Abcd1234', 'Abcd5678').matches).toBe(false)
    expect(checkPassword('Abcd1234', 'Abcd1234').matches).toBe(true)
  })

  it('matches=false quando confirmation está vazia', () => {
    expect(checkPassword('Abcd1234', '').matches).toBe(false)
  })

  it('valid=true só com TODAS as regras OK', () => {
    expect(checkPassword('Abcd1234', 'Abcd1234').valid).toBe(true)
    // tudo menos uma regra
    expect(checkPassword('abcd1234', 'abcd1234').valid).toBe(false) // sem maiúscula
    expect(checkPassword('Abcdefgh', 'Abcdefgh').valid).toBe(false) // sem número
    expect(checkPassword('Ab1', 'Ab1').valid).toBe(false) // muito curta
    expect(checkPassword('Abcd1234', 'Abcd5678').valid).toBe(false) // não bate
  })

  it('aceita senhas com caracteres especiais e acentos', () => {
    expect(checkPassword('Sénha@1234', 'Sénha@1234').valid).toBe(true)
  })

  it('é determinístico para a mesma entrada', () => {
    const a = checkPassword('Abcd1234', 'Abcd1234')
    const b = checkPassword('Abcd1234', 'Abcd1234')
    expect(a).toEqual(b)
  })
})
