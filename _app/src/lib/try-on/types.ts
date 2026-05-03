export interface TryOnProviderInput {
  customer: {
    /** Selfie do cliente usada como referência principal do rosto. */
    selfieImage: string
    /** Foto de corpo inteiro usada como referência principal do corpo/postura. */
    fullBodyImage: string
  }
  references: {
    /** Alias explícito para integração com providers que separam face/body reference. */
    faceReferenceImage: string
    bodyReferenceImage: string
  }
  product: {
    /** URL pública da imagem da peça. */
    productImage: string
  }
}

export interface TryOnProviderResult {
  /** URL temporária do resultado (TTL definido pelo provider). */
  resultUrl: string
  /** ID interno do request no provider (útil para auditoria). */
  requestId: string
  /** Quanto tempo levou (ms). */
  durationMs: number
  /** Quando a URL expira (ISO). */
  expiresAt: string
}

export interface TryOnProvider {
  readonly name: 'fashn' | 'replicate' | 'google' | 'openai'
  generate(input: TryOnProviderInput): Promise<TryOnProviderResult>
}

export class TryOnProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly retriable: boolean = false,
  ) {
    super(message)
    this.name = 'TryOnProviderError'
  }
}
