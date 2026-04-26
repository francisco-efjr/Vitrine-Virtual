import { describe, expect, it } from 'vitest'
import { toCsv } from '../export'

describe('toCsv', () => {
  it('gera CSV simples com BOM', () => {
    const csv = toCsv(
      [{ a: 1, b: 'hello' }],
      [
        { key: 'a', label: 'A' },
        { key: 'b', label: 'B' },
      ],
    )
    // Começa com BOM
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain('A,B')
    expect(csv).toContain('1,hello')
  })

  it('escapa vírgulas e aspas', () => {
    const csv = toCsv(
      [{ nome: 'Blusa, branca', desc: 'tem "detalhes"' }],
      [
        { key: 'nome', label: 'Nome' },
        { key: 'desc', label: 'Descrição' },
      ],
    )
    expect(csv).toContain('"Blusa, branca"')
    expect(csv).toContain('"tem ""detalhes"""')
  })

  it('lida com null e undefined', () => {
    const csv = toCsv(
      [{ a: null, b: undefined, c: 'ok' }],
      [
        { key: 'a', label: 'A' },
        { key: 'b', label: 'B' },
        { key: 'c', label: 'C' },
      ],
    )
    expect(csv).toContain(',,ok')
  })

  it('lida com quebras de linha', () => {
    const csv = toCsv(
      [{ desc: 'linha 1\nlinha 2' }],
      [{ key: 'desc', label: 'Desc' }],
    )
    expect(csv).toContain('"linha 1\nlinha 2"')
  })
})
