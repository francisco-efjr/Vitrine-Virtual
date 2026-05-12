import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TryOnModal } from '../try-on-modal'

vi.mock('@/lib/images/client-standardize', () => ({
  preparePreviewableImage: vi.fn(async (file: File) => ({
    file,
    previewUrl: `blob:${file.name}`,
  })),
}))

describe('TryOnModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('exige uma foto antes de permitir continuar', async () => {
    const { container } = render(
      <TryOnModal
        open
        onClose={vi.fn()}
        pecaId="11111111-1111-1111-1111-111111111111"
        pecaNome="Blazer"
        whatsappE164={null}
        garmentImageUrl={null}
        garmentThumbUrl={null}
      />,
    )

    const continueButton = screen.getByRole('button', { name: /^continuar$/i })
    expect(continueButton).toBeDisabled()

    fireEvent.click(screen.getByText(/concordo com o uso temporário/i))
    expect(continueButton).toBeDisabled() // still no photo

    const fileInputs = Array.from(container.querySelectorAll('input[type="file"]'))
    const photoFile = new File(['foto'], 'foto.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInputs[1] as HTMLInputElement, { target: { files: [photoFile] } })

    await waitFor(() => expect(continueButton).toBeEnabled())
    fireEvent.click(continueButton)
    await waitFor(() =>
      expect(screen.getByText(/confira sua foto e a peça/i)).toBeInTheDocument(),
    )
  })

  it('envia apenas uma foto do cliente em customerPhoto', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        ok: true,
        data: {
          result_url: 'https://cdn.example.com/result.webp',
        },
      }),
    )

    const { container } = render(
      <TryOnModal
        open
        onClose={vi.fn()}
        pecaId="11111111-1111-1111-1111-111111111111"
        pecaNome="Blazer"
        whatsappE164={null}
        garmentImageUrl="https://cdn.example.com/product.webp"
        garmentThumbUrl={null}
      />,
    )

    const fileInputs = Array.from(container.querySelectorAll('input[type="file"]'))
    const photoFile = new File(['foto'], 'foto.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInputs[1] as HTMLInputElement, { target: { files: [photoFile] } })

    fireEvent.click(screen.getByText(/concordo com o uso temporário/i))
    const continueButton = screen.getByRole('button', { name: /^continuar$/i })
    await waitFor(() => expect(continueButton).toBeEnabled())
    fireEvent.click(continueButton)

    await waitFor(() =>
      expect(screen.getByText(/confira sua foto e a peça/i)).toBeInTheDocument(),
    )

    fireEvent.click(screen.getByRole('button', { name: /gerar prévia/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    const [, init] = fetchMock.mock.calls[0] ?? []
    const body = init?.body as FormData
    expect(body.get('customerPhoto')).toBeInstanceOf(File)
    expect(body.has('customerSelfieImage')).toBe(false)
    expect(body.has('customerFullBodyImage')).toBe(false)
    expect(body.get('garment_url_override')).toBe('https://cdn.example.com/product.webp')
  })
})
