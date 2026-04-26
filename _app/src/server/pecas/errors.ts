export class PecaError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number = 400,
  ) {
    super(message)
    this.name = 'PecaError'
  }
}

export const PecaNaoEncontradaError = () =>
  new PecaError('Peça não encontrada', 'PECA_NAO_ENCONTRADA', 404)

export const FotoNaoEncontradaError = () =>
  new PecaError('Foto não encontrada', 'FOTO_NAO_ENCONTRADA', 404)

export const LimiteFotosExcedidoError = () =>
  new PecaError('Máximo de 8 fotos por peça', 'LIMITE_FOTOS', 400)

export const FotoForaDaPecaError = () =>
  new PecaError('Foto não pertence a esta peça', 'FOTO_FORA_DA_PECA', 400)
