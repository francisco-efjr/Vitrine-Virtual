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

    const confirmButton = screen.getByRole('button', { name: /confirmar foto/i })
    expect(confirmButton).toBeDisabled()

    const fileInputs = Array.from(container.querySelectorAll('input[type="file"]'))
    const photoFile = new File(['foto'], 'foto.jpg', { type: 'image/jpeg' })

    fireEvent.click(screen.getByText(/concordo que minha foto/i))
    expect(confirmButton).toBeEnabled()

    fireEvent.click(confirmButton)
    expect(screen.getAllByText('Envie uma foto para continuar.').length).toBeGreaterThan(0)

    fireEvent.change(fileInputs[0] as HTMLInputElement, { target: { files: [photoFile] } })
    await waitFor(() => expect(screen.getAllByAltText('Sua foto').length).toBeGreaterThan(0))

    fireEvent.click(confirmButton)
    await waitFor(() =>
      expect(screen.getByText(/confirme a foto antes de continuar/i)).toBeInTheDocument(),
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

    fireEvent.change(fileInputs[0] as HTMLInputElement, { target: { files: [photoFile] } })
    await waitFor(() => expect(screen.getAllByAltText('Sua foto').length).toBeGreaterThan(0))

    fireEvent.click(screen.getByText(/concordo que minha foto/i))
    fireEvent.click(screen.getByRole('button', { name: /confirmar foto/i }))

    await waitFor(() =>
      expect(screen.getByText(/confirme a foto antes de continuar/i)).toBeInTheDocument(),
    )

    fireEvent.click(screen.getByRole('button', { name: /entrar na cabine/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    const [, init] = fetchMock.mock.calls[0] ?? []
    const body = init?.body as FormData
    expect(body.get('customerPhoto')).toBeInstanceOf(File)
    expect(body.has('customerSelfieImage')).toBe(false)
    expect(body.has('customerFullBodyImage')).toBe(false)
    expect(body.get('garment_url_override')).toBe('https://cdn.example.com/product.webp')
  })
})
