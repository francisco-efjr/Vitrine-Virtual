import { describe, expect, it } from 'vitest'
import { mapProviderFailure } from '../provider-errors'

describe('mapProviderFailure', () => {
  it('mapeia 429 do Nano Banana para erro mais claro de indisponibilidade do provider', () => {
    expect(mapProviderFailure('Nano Banana 429', 'development')).toEqual({
      code: 'PROVIDER_RATE_LIMITED',
      message:
        'Nano Banana indisponível no momento por limite da API. Tente novamente em instantes ou revise a cota da chave configurada. (Nano Banana 429)',
      status: 503,
    })
  })

  it('mapeia 401/403 do Nano Banana para erro de autenticação/configuração', () => {
    expect(mapProviderFailure('Nano Banana 403', 'production')).toEqual({
      code: 'PROVIDER_AUTH_FAILED',
      message:
        'Nano Banana recusou a autenticação da API. Revise a chave GOOGLE_AI_API_KEY e a disponibilidade do modelo.',
      status: 502,
    })
  })

  it('mantém fallback genérico para outros erros', () => {
    expect(mapProviderFailure('timeout upstream', 'production')).toEqual({
      code: 'PROVIDER_FAILED',
      message: 'Não foi possível gerar a simulação agora',
      status: 502,
    })
  })
})
