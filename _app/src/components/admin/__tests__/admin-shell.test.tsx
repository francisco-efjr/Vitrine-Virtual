import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AdminShell } from '../admin-shell'

describe('AdminShell', () => {
  it('permite recolher e expandir a barra lateral', () => {
    render(
      <AdminShell
        loja={{ nome: 'Atelier Clara', slug: 'atelier-clara', logo_url: null }}
        user={{ nome: 'Clara Mendes', email: 'clara@atelier.com' }}
      >
        <div>Conteúdo</div>
      </AdminShell>,
    )

    expect(screen.getAllByText('Disponíveis').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByLabelText('Recolher menu'))
    expect(screen.queryByText('Disponíveis')).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Expandir menu'))
    expect(screen.getAllByText('Disponíveis').length).toBeGreaterThan(0)
  })
})
