import { describe, expect, it } from 'vitest'
import { isReservedSlug } from '../slug'

describe('isReservedSlug', () => {
  it.each(['admin', 'api', 'auth', 'login', 'super', 'privacidade', 'termos', 'v'])(
    'reserva "%s"',
    (s) => {
      expect(isReservedSlug(s)).toBe(true)
    },
  )

  it.each(['atelier-laila', 'closet-da-be', 'studio-manu'])(
    'não reserva "%s"',
    (s) => {
      expect(isReservedSlug(s)).toBe(false)
    },
  )

  it('é case-insensitive', () => {
    expect(isReservedSlug('ADMIN')).toBe(true)
    expect(isReservedSlug('Login')).toBe(true)
  })
})
