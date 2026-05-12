import { describe, expect, it } from 'vitest'
import {
  IMAGE_INVALID_FORMAT_MESSAGE,
  IMAGE_TRY_ON_CUSTOMER_MAX_UPLOAD_BYTES,
  buildStandardizedImageFilename,
  sanitizeImageFilename,
  validateImageUploadMeta,
} from '../upload'

describe('validateImageUploadMeta', () => {
  it('aceita formatos suportados incluindo HEIC', () => {
    expect(
      validateImageUploadMeta({
        filename: 'look-final.heic',
        contentType: 'image/heic',
        size: 2 * 1024 * 1024,
      }),
    ).toEqual({ ok: true })
  })

  it('rejeita formato inválido com mensagem em português', () => {
    expect(
      validateImageUploadMeta({
        filename: 'script.svg',
        contentType: 'image/svg+xml',
        size: 200,
      }),
    ).toEqual({ ok: false, message: IMAGE_INVALID_FORMAT_MESSAGE })
  })

  it('rejeita arquivo acima de 10 MB', () => {
    expect(
      validateImageUploadMeta({
        filename: 'foto.jpg',
        contentType: 'image/jpeg',
        size: 11 * 1024 * 1024,
      }),
    ).toEqual({ ok: false, message: 'A imagem deve ter no máximo 10 MB.' })
  })

  it('aceita limite maior para foto do cliente no provador', () => {
    expect(
      validateImageUploadMeta(
        {
          filename: 'foto.jpg',
          contentType: 'image/jpeg',
          size: 59 * 1024 * 1024,
        },
        { maxBytes: IMAGE_TRY_ON_CUSTOMER_MAX_UPLOAD_BYTES },
      ),
    ).toEqual({ ok: true })

    expect(
      validateImageUploadMeta(
        {
          filename: 'foto.jpg',
          contentType: 'image/jpeg',
          size: 61 * 1024 * 1024,
        },
        { maxBytes: IMAGE_TRY_ON_CUSTOMER_MAX_UPLOAD_BYTES },
      ),
    ).toEqual({ ok: false, message: 'A imagem deve ter no máximo 60 MB.' })
  })

  it('rejeita nome de arquivo inseguro', () => {
    expect(
      validateImageUploadMeta({
        filename: 'foto<script>.jpg',
        contentType: 'image/jpeg',
        size: 400,
      }),
    ).toEqual({ ok: false, message: IMAGE_INVALID_FORMAT_MESSAGE })
  })
})

describe('sanitizeImageFilename', () => {
  it('normaliza nomes com acento e espaços', () => {
    expect(sanitizeImageFilename(' Foto verão 2026 .JPG ')).toBe('foto-verao-2026')
  })

  it('gera nome padronizado em webp', () => {
    expect(buildStandardizedImageFilename('Selfie Final.HEIC')).toBe('selfie-final.webp')
  })
})
