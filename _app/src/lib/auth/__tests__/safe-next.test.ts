import { describe, expect, it } from 'vitest'
import { DEFAULT_NEXT, safeNext } from '../safe-next'

describe('safeNext (BUG-007 — open redirect)', () => {
  it.each([
    ['/admin', '/admin'],
    ['/admin/super', '/admin/super'],
    ['/admin/definir-senha', '/admin/definir-senha'],
    ['/redefinir-senha', '/redefinir-senha'],
  ])('mantém path interno permitido %s', (input, expected) => {
    expect(safeNext(input)).toBe(expected)
  })

  // Semântica conservadora (igual à referência do QA / M-SEC-001):
  // só path exato ou prefixo com "/". Variações com query/fragment caem no
  // fallback — o fluxo real de recuperação usa `/redefinir-senha` limpo.
  it('rejeita variação com query string na whitelist (comportamento estrito)', () => {
    expect(safeNext('/redefinir-senha?token=abc')).toBe(DEFAULT_NEXT)
  })

  const rejeitados: Array<[string | null | undefined, string]> = [
    ['https://evil.com', 'URL absoluta externa'],
    ['http://evil.com/admin', 'http externo'],
    ['//evil.com', 'protocol-relative'],
    ['/\\evil.com', 'backslash trick'],
    ['/contato', 'path interno fora da whitelist'],
    ['/v/loja-x', 'rota pública fora da whitelist'],
    ['javascript:alert(1)', 'esquema javascript'],
    ['', 'vazio'],
    [null, 'null'],
    [undefined, 'undefined'],
  ]
  it.each(rejeitados)('rejeita %s (%s) → fallback', (input) => {
    expect(safeNext(input)).toBe(DEFAULT_NEXT)
  })

  it('respeita fallback customizado', () => {
    expect(safeNext('https://evil.com', '/login')).toBe('/login')
  })
})
