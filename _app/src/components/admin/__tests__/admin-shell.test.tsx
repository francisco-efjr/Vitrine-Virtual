import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AdminShell } from '../admin-shell'

describe('AdminShell', () => {
  it('permite recolher e expandir a barra lateral', () => {
    render(
      <AdminShell loja={{ nome: 'Atelier Clara', slug: 'atelier-clara' }}>
        <div>Conteúdo</div>
      </AdminShell>,
    )

    expect(screen.getByText('Peças disponíveis')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Recolher menu'))
    expect(screen.queryByText('Peças disponíveis')).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Expandir menu'))
    expect(screen.getByText('Peças disponíveis')).toBeInTheDocument()
  })
})
