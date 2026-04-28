import { describe, expect, it } from 'vitest'
import { mapProviderFailure } from '../provider-errors'

describe('mapProviderFailure', () => {
  it('mapeia 429 do Nano Banana para erro mais claro de indisponibilidade do provider', () => {
    expect(mapProviderFailure('Nano Banana 429')).toEqual({
      code: 'PROVIDER_RATE_LIMITED',
      message: 'O provador virtual está temporariamente indisponível. Tente novamente em instantes.',
      status: 503,
    })
  })

  it('mapeia 401/403 do Nano Banana para erro de autenticação/configuração', () => {
    expect(mapProviderFailure('Nano Banana 403')).toEqual({
      code: 'PROVIDER_AUTH_FAILED',
      message: 'O provador virtual está temporariamente indisponível. Tente novamente mais tarde.',
      status: 502,
    })
  })

  it('mantém fallback genérico para outros erros', () => {
    expect(mapProviderFailure('timeout upstream')).toEqual({
      code: 'PROVIDER_FAILED',
      message: 'Não foi possível gerar o provador virtual agora.',
      status: 502,
    })
  })
})
