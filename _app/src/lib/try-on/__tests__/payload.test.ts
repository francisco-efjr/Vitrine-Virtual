import { describe, expect, it } from 'vitest'
import { buildTryOnProviderInput } from '../payload'

describe('buildTryOnProviderInput', () => {
  it('mapeia selfie para referência de rosto e corpo inteiro para referência corporal', () => {
    const payload = buildTryOnProviderInput({
      customerSelfieImage: 'data:image/webp;base64,selfie',
      customerFullBodyImage: 'data:image/webp;base64,body',
      productImage: 'https://cdn.example.com/product.webp',
    })

    expect(payload).toEqual({
      customer: {
        selfieImage: 'data:image/webp;base64,selfie',
        fullBodyImage: 'data:image/webp;base64,body',
      },
      references: {
        faceReferenceImage: 'data:image/webp;base64,selfie',
        bodyReferenceImage: 'data:image/webp;base64,body',
      },
      product: {
        productImage: 'https://cdn.example.com/product.webp',
      },
    })
  })
})
