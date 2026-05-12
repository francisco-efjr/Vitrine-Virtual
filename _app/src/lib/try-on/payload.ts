import type { TryOnProviderInput } from './types'

export function buildTryOnProviderInput({
  customerPhoto,
  productImage,
  background,
}: {
  customerPhoto: string
  productImage: string
  background?: TryOnProviderInput['background']
}): TryOnProviderInput {
  return {
    customer: {
      photoImage: customerPhoto,
    },
    references: {
      customerReferenceImage: customerPhoto,
    },
    product: {
      productImage,
    },
    background: background ?? {
      mode: 'white',
    },
  }
}
