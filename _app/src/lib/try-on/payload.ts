import type { TryOnProviderInput } from './types'

export function buildTryOnProviderInput({
  customerPhoto,
  productImage,
  background,
  googleModelOverride,
}: {
  customerPhoto: string
  productImage: string
  background?: TryOnProviderInput['background']
  googleModelOverride?: string | null
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
    generation: {
      googleModelOverride: googleModelOverride ?? null,
    },
  }
}
