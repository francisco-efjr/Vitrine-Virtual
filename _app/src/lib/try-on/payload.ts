import type { TryOnProviderInput } from './types'

export function buildTryOnProviderInput({
  customerSelfieImage,
  customerFullBodyImage,
  productImage,
}: {
  customerSelfieImage: string
  customerFullBodyImage: string
  productImage: string
}): TryOnProviderInput {
  return {
    customer: {
      selfieImage: customerSelfieImage,
      fullBodyImage: customerFullBodyImage,
    },
    references: {
      faceReferenceImage: customerSelfieImage,
      bodyReferenceImage: customerFullBodyImage,
    },
    product: {
      productImage,
    },
  }
}
