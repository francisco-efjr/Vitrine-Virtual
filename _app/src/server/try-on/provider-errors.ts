export interface ProviderFailureResponse {
  code: string
  message: string
  status: number
}

export function mapProviderFailure(message: string, nodeEnv = process.env.NODE_ENV): ProviderFailureResponse {
  const detailSuffix = nodeEnv === 'development' ? ` (${message})` : ''

  if (/\b(Nano Banana|Google AI)\s+429\b/i.test(message)) {
    return {
      code: 'PROVIDER_RATE_LIMITED',
      message: `Nano Banana indisponível no momento por limite da API. Tente novamente em instantes ou revise a cota da chave configurada.${detailSuffix}`,
      status: 503,
    }
  }

  if (/\b(Nano Banana|Google AI)\s+(401|403)\b/i.test(message)) {
    return {
      code: 'PROVIDER_AUTH_FAILED',
      message: `Nano Banana recusou a autenticação da API. Revise a chave GOOGLE_AI_API_KEY e a disponibilidade do modelo.${detailSuffix}`,
      status: 502,
    }
  }

  return {
    code: 'PROVIDER_FAILED',
    message:
      nodeEnv === 'development'
        ? `Provedor falhou: ${message}`
        : 'Não foi possível gerar a simulação agora',
    status: 502,
  }
}
