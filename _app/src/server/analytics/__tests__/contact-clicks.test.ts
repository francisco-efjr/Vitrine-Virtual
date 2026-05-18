import { describe, expect, it } from 'vitest'
import { deviceTypeFromUA, isContactChannel } from '../contact-clicks'

describe('isContactChannel', () => {
  it.each(['instagram', 'tiktok', 'whatsapp'])('aceita "%s"', (c) => {
    expect(isContactChannel(c)).toBe(true)
  })
  it.each(['facebook', '', null, undefined, 42])('rejeita %s', (c) => {
    expect(isContactChannel(c)).toBe(false)
  })
})

describe('deviceTypeFromUA', () => {
  it('mobile', () => {
    expect(
      deviceTypeFromUA(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605 Mobile',
      ),
    ).toBe('mobile')
  })
  it('tablet (iPad)', () => {
    expect(deviceTypeFromUA('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605')).toBe(
      'tablet',
    )
  })
  it('desktop', () => {
    expect(
      deviceTypeFromUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome'),
    ).toBe('desktop')
  })
  it('unknown quando ausente', () => {
    expect(deviceTypeFromUA(null)).toBe('unknown')
    expect(deviceTypeFromUA(undefined)).toBe('unknown')
  })
})
