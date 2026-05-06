export interface TryOnProviderInput {
  customer: {
    /** Foto única do cliente usada como referência completa. */
    photoImage: string
  }
  references: {
    /** Alias usado pelos providers para receber a foto do cliente. */
    customerReferenceImage: string
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
