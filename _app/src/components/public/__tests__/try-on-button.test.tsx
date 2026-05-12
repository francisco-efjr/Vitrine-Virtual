import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TryOnButton } from '../try-on-button'

describe('TryOnButton', () => {
  it('renderiza Experimentar como CTA principal e nunca cita "IA"', () => {
    render(
      <TryOnButton
        pecaId="11111111-1111-1111-1111-111111111111"
        pecaNome="Vestido Midi"
        whatsappE164={null}
      />,
    )

    expect(screen.getByRole('button', { name: /experimentar/i })).toBeInTheDocument()
    // Validamos que o texto não introduz "IA"/"AI" em parte alguma do botão
    expect(screen.queryByText(/\bIA\b/)).not.toBeInTheDocument()
  })
})
