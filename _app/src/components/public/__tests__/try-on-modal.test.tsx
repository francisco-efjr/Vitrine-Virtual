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

  it('exige selfie e foto de corpo inteiro antes de permitir continuar', async () => {
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

    const confirmButton = screen.getByRole('button', { name: /confirmar fotos/i })
    expect(confirmButton).toBeDisabled()

    const fileInputs = Array.from(container.querySelectorAll('input[type="file"]'))
    const selfieFile = new File(['selfie'], 'selfie.jpg', { type: 'image/jpeg' })
    const corpoFile = new File(['corpo'], 'corpo.jpg', { type: 'image/jpeg' })

    fireEvent.click(screen.getByText(/concordo que minhas fotos/i))
    expect(confirmButton).toBeEnabled()
    fireEvent.click(confirmButton)
    expect(screen.getAllByText('Envie uma selfie para continuar.').length).toBeGreaterThan(0)

    fireEvent.change(fileInputs[1] as HTMLInputElement, { target: { files: [selfieFile] } })
    await waitFor(() => expect(screen.getAllByAltText('Foto selfie').length).toBeGreaterThan(0))
    fireEvent.click(confirmButton)
    expect(screen.getAllByText('Envie uma foto de corpo inteiro para continuar.').length).toBeGreaterThan(0)

    fireEvent.change(fileInputs[3] as HTMLInputElement, { target: { files: [corpoFile] } })
    await waitFor(() =>
      expect(screen.getAllByAltText('Foto de corpo inteiro no espelho').length).toBeGreaterThan(0),
    )
    fireEvent.click(confirmButton)

    await waitFor(() => expect(screen.getByText(/confirme as fotos antes de continuar/i)).toBeInTheDocument())
  })

  it('envia selfie e foto de corpo inteiro em campos separados', async () => {
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
    const selfieFile = new File(['selfie'], 'selfie.jpg', { type: 'image/jpeg' })
    const corpoFile = new File(['corpo'], 'corpo.jpg', { type: 'image/jpeg' })

    fireEvent.change(fileInputs[1] as HTMLInputElement, { target: { files: [selfieFile] } })
    fireEvent.change(fileInputs[3] as HTMLInputElement, { target: { files: [corpoFile] } })
    await waitFor(() => expect(screen.getAllByAltText('Foto selfie').length).toBeGreaterThan(0))
    await waitFor(() =>
      expect(screen.getAllByAltText('Foto de corpo inteiro no espelho').length).toBeGreaterThan(0),
    )
    fireEvent.click(screen.getByText(/concordo que minhas fotos/i))
    fireEvent.click(screen.getByRole('button', { name: /confirmar fotos/i }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /gerar provador virtual/i })).toBeInTheDocument(),
    )

    fireEvent.click(screen.getByRole('button', { name: /gerar provador virtual/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    const [, init] = fetchMock.mock.calls[0] ?? []
    const body = init?.body as FormData
    expect(body.get('customerSelfieImage')).toBeInstanceOf(File)
    expect(body.get('customerFullBodyImage')).toBeInstanceOf(File)
    expect(body.get('garment_url_override')).toBe('https://cdn.example.com/product.webp')
  })
})
