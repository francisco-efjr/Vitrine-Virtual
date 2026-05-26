import type { TryOnProviderInput } from './types'

export function buildTryOnProviderInput({
  customerPhoto,
  productImage,
  background,
  googleModelOverride,
  promptOverride,
  promptVariantId,
}: {
  customerPhoto: string
  productImage: string
  background?: TryOnProviderInput['background']
  googleModelOverride?: string | null
  promptOverride?: string | null
  promptVariantId?: string | null
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
      promptOverride: promptOverride ?? null,
      promptVariantId: promptVariantId ?? null,
    },
  }
}
