import type { TryOnProviderInput } from './types'

export function buildTryOnProviderInput({
  customerPhoto,
  productImage,
}: {
  customerPhoto: string
  productImage: string
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
  }
}
