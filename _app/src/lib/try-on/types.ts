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
  background: {
    /** Fundo parametrizado pela loja para a imagem final. */
    mode: 'white' | 'custom'
    /** URL pÃºblica do fundo cadastrado pela loja quando mode=custom. */
    backgroundImage?: string
  }
  /** Parâmetros de geração resolvidos por loja (modelo, etc). */
  generation?: {
    /** Modelo Gemini técnico resolvido a partir do ai_image_model da loja. */
    googleModelOverride?: string | null
  }
}

export interface SafetyRating {
  /** ex.: HARM_CATEGORY_SEXUALLY_EXPLICIT, HARM_CATEGORY_DANGEROUS_CONTENT. */
  category: string
  /** ex.: NEGLIGIBLE | LOW | MEDIUM | HIGH. */
  probability: 'NEGLIGIBLE' | 'LOW' | 'MEDIUM' | 'HIGH' | string
  /** Score 0..1 quando o provider devolve. */
  probabilityScore?: number
  /** Flag de bloqueio explícito do provider. */
  blocked?: boolean
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
  /** Nome técnico do modelo efetivamente usado (para a base de qualidade). */
  modelUsed?: string
  /** Prompt final enviado ao modelo (base de aprendizado — ADR 0009). */
  finalPrompt?: string
  /** Parâmetros de geração enviados ao modelo. */
  generationParams?: Record<string, unknown>
  /** Bucket onde o resultado foi persistido (quando o provider salva). */
  resultBucket?: string
  /** Caminho do resultado no bucket. */
  resultPath?: string
  /** Safety ratings retornados pelo provider quando disponíveis (research §14
   *  nsfwClean). Hoje só o Google preenche. */
  safetyRatings?: SafetyRating[]
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
