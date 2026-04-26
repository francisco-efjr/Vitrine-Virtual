import { afterEach, describe, expect, it, vi } from 'vitest'
import { logger } from './logger'

describe('logger', () => {
  afterEach(() => vi.restoreAllMocks())

  it('emite JSON estruturado', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    logger.info('hello', { foo: 'bar' })
    expect(spy).toHaveBeenCalledOnce()
    const arg = spy.mock.calls[0]?.[0] as string
    const parsed = JSON.parse(arg)
    expect(parsed.level).toBe('info')
    expect(parsed.message).toBe('hello')
    expect(parsed.meta.foo).toBe('bar')
    expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('redacta campos proibidos (password, token, foto, ip, email)', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    logger.info('test', {
      password: 'super-secret',
      token: 'abc',
      foto: 'data:image/jpeg...',
      ip: '1.2.3.4',
      email: 'a@b.com',
      safe: 'visible',
    })
    const parsed = JSON.parse(spy.mock.calls[0]?.[0] as string)
    expect(parsed.meta.password).toBe('[REDACTED]')
    expect(parsed.meta.token).toBe('[REDACTED]')
    expect(parsed.meta.foto).toBe('[REDACTED]')
    expect(parsed.meta.ip).toBe('[REDACTED]')
    expect(parsed.meta.email).toBe('[REDACTED]')
    expect(parsed.meta.safe).toBe('visible')
  })

  it('redacta recursivamente em estruturas aninhadas', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    logger.info('test', { user: { name: 'X', email: 'x@y.com' } })
    const parsed = JSON.parse(spy.mock.calls[0]?.[0] as string)
    expect(parsed.meta.user.name).toBe('X')
    expect(parsed.meta.user.email).toBe('[REDACTED]')
  })

  it('trunca strings muito longas', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    logger.info('test', { big: 'a'.repeat(1000) })
    const parsed = JSON.parse(spy.mock.calls[0]?.[0] as string)
    expect(parsed.meta.big.length).toBeLessThan(600)
    expect(parsed.meta.big).toContain('[truncated]')
  })

  it('warn vai para console.warn e error vai para console.error', () => {
    const w = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const e = vi.spyOn(console, 'error').mockImplementation(() => {})
    logger.warn('w')
    logger.error('e')
    expect(w).toHaveBeenCalledOnce()
    expect(e).toHaveBeenCalledOnce()
  })
})
