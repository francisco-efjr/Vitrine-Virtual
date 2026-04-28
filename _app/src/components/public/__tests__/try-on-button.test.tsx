import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TryOnButton } from '../try-on-button'

describe('TryOnButton', () => {
  it('usa a nomenclatura Provador Virtual sem mencionar IA', () => {
    render(
      <TryOnButton
        pecaId="11111111-1111-1111-1111-111111111111"
        pecaNome="Vestido Midi"
        whatsappE164={null}
      />,
    )

    expect(screen.getByRole('button', { name: /abrir provador virtual/i })).toBeInTheDocument()
    expect(screen.queryByText(/ia/i)).not.toBeInTheDocument()
  })
})
