export interface ProviderFailureResponse {
  code: string
  message: string
  status: number
}

export function mapProviderFailure(message: string): ProviderFailureResponse {
  if (/\b(Nano Banana|Google AI)\s+429\b/i.test(message)) {
    return {
      code: 'PROVIDER_RATE_LIMITED',
      message: 'O provador virtual está temporariamente indisponível. Tente novamente em instantes.',
      status: 503,
    }
  }

  if (/\b(Nano Banana|Google AI)\s+(401|403)\b/i.test(message)) {
    return {
      code: 'PROVIDER_AUTH_FAILED',
      message: 'O provador virtual está temporariamente indisponível. Tente novamente mais tarde.',
      status: 502,
    }
  }

  return {
    code: 'PROVIDER_FAILED',
    message: 'Não foi possível gerar o provador virtual agora.',
    status: 502,
  }
}
