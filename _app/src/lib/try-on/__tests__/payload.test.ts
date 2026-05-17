import { describe, expect, it } from 'vitest'
import { buildTryOnProviderInput } from '../payload'

describe('buildTryOnProviderInput', () => {
  it('mapeia a foto única do cliente para customer e references', () => {
    const payload = buildTryOnProviderInput({
      customerPhoto: 'data:image/webp;base64,foto',
      productImage: 'https://cdn.example.com/product.webp',
    })

    expect(payload).toEqual({
      customer: {
        photoImage: 'data:image/webp;base64,foto',
      },
      references: {
        customerReferenceImage: 'data:image/webp;base64,foto',
      },
      product: {
        productImage: 'https://cdn.example.com/product.webp',
      },
      background: {
        mode: 'white',
      },
      generation: {
        googleModelOverride: null,
      },
    })
  })

  it('customer.photoImage e references.customerReferenceImage apontam para a mesma imagem', () => {
    const photo = 'data:image/jpeg;base64,abc123'
    const payload = buildTryOnProviderInput({
      customerPhoto: photo,
      productImage: 'https://cdn.example.com/p.jpg',
    })

    expect(payload.customer.photoImage).toBe(photo)
    expect(payload.references.customerReferenceImage).toBe(photo)
  })

  it('inclui fundo personalizado quando configurado', () => {
    const payload = buildTryOnProviderInput({
      customerPhoto: 'data:image/jpeg;base64,abc123',
      productImage: 'https://cdn.example.com/p.jpg',
      background: {
        mode: 'custom',
        backgroundImage: 'https://cdn.example.com/background.jpg',
      },
    })

    expect(payload.background).toEqual({
      mode: 'custom',
      backgroundImage: 'https://cdn.example.com/background.jpg',
    })
  })
})
