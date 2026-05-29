import { describe, expect, it } from 'vitest'
import { composeRetryPrompt } from '..'

describe('composeRetryPrompt', () => {
  it('retorna prompt original quando não há hints', () => {
    expect(composeRetryPrompt('original prompt', [])).toBe('original prompt')
  })

  it('anexa cláusulas de reforço com separador padrão', () => {
    const composed = composeRetryPrompt('original prompt', [
      'hint A',
      'hint B',
    ])
    expect(composed).toContain('original prompt')
    expect(composed).toContain('--- RETRY REINFORCEMENT ---')
    expect(composed).toContain('hint A')
    expect(composed).toContain('hint B')
  })

  it('preserva ordem dos hints', () => {
    const composed = composeRetryPrompt('p', ['first', 'second'])
    const firstIdx = composed.indexOf('first')
    const secondIdx = composed.indexOf('second')
    expect(firstIdx).toBeLessThan(secondIdx)
  })
})
