/**
 * Erros de domínio da camada de lojas.
 * Permite que API routes façam mapeamento status code -> mensagem amigável.
 */

export class LojaError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number = 400,
  ) {
    super(message)
    this.name = 'LojaError'
  }
}

export const SlugIndisponivelError = () =>
  new LojaError('Slug já está em uso por outra loja', 'SLUG_INDISPONIVEL', 409)

export const EmailJaCadastradoError = () =>
  new LojaError('Já existe uma loja para este e-mail', 'EMAIL_JA_CADASTRADO', 409)

export const LojaNaoEncontradaError = () =>
  new LojaError('Loja não encontrada', 'LOJA_NAO_ENCONTRADA', 404)
