export interface TryOnProviderInput {
  /** Foto do cliente final em base64 (data URL ou URL pública). */
  modelImage: string
  /** URL pública da foto principal da peça. */
  garmentImage: string
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
