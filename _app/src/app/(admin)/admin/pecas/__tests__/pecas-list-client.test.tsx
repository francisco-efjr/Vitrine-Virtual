import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PecasListClient } from '../pecas-list-client'

vi.mock('../peca-form-modal', () => ({
  PecaFormModal: () => null,
}))

describe('PecasListClient', () => {
  it('mantém fallback consistente quando preço ou tamanho não existem', () => {
    render(
      <PecasListClient
        title="Peças disponíveis"
        showAll={false}
        initialPecas={[
          {
            id: '1',
            loja_id: 'l1',
            nome: 'Vestido',
            tamanho: 'M',
            preco_centavos: 12990,
            status: 'disponivel',
            foto_principal_id: null,
            created_at: '',
            vendida_em: null,
            foto_principal_url: null,
          },
          {
            id: '2',
            loja_id: 'l1',
            nome: 'Blusa',
            tamanho: null,
            preco_centavos: null,
            status: 'disponivel',
            foto_principal_id: null,
            created_at: '',
            vendida_em: null,
            foto_principal_url: null,
          },
        ]}
      />,
    )

    expect(screen.getByText('Vestido')).toBeInTheDocument()
    expect(screen.getByText('Blusa')).toBeInTheDocument()
    expect(screen.getByText('Consulte')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Editar' })).toHaveLength(2)
    const imageAreas = document.querySelectorAll('.aspect-square')
    expect(imageAreas.length).toBeGreaterThan(0)
  })
})
