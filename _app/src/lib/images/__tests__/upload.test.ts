import { describe, expect, it } from 'vitest'
import {
  IMAGE_INVALID_FORMAT_MESSAGE,
  IMAGE_RAW_FORMAT_MESSAGE,
  IMAGE_TRY_ON_CUSTOMER_MAX_UPLOAD_BYTES,
  buildStandardizedImageFilename,
  isRawImageFormat,
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

  it('aceita HEIC do iOS Safari com MIME vazio (Files app / AirDrop)', () => {
    expect(
      validateImageUploadMeta({
        filename: 'IMG_1234.HEIC',
        contentType: '',
        size: 3 * 1024 * 1024,
      }),
    ).toEqual({ ok: true })
  })

  it('aceita HEIC com MIME application/octet-stream (Chrome iOS)', () => {
    expect(
      validateImageUploadMeta({
        filename: 'foto.heic',
        contentType: 'application/octet-stream',
        size: 3 * 1024 * 1024,
      }),
    ).toEqual({ ok: true })
  })

  it('aceita JPEG com MIME application/octet-stream + extensão válida', () => {
    expect(
      validateImageUploadMeta({
        filename: 'IMG_2026.jpg',
        contentType: 'application/octet-stream',
        size: 2 * 1024 * 1024,
      }),
    ).toEqual({ ok: true })
  })

  it('aceita variante image/heic-sequence (Live Photo still)', () => {
    expect(
      validateImageUploadMeta({
        filename: 'live.heic',
        contentType: 'image/heic-sequence',
        size: 4 * 1024 * 1024,
      }),
    ).toEqual({ ok: true })
  })

  it('rejeita extensão inválida mesmo com MIME ambíguo', () => {
    expect(
      validateImageUploadMeta({
        filename: 'malware.pdf',
        contentType: '',
        size: 400,
      }),
    ).toEqual({ ok: false, message: IMAGE_INVALID_FORMAT_MESSAGE })
  })

  it('rejeita MIME explicitamente diferente mesmo com extensão válida', () => {
    expect(
      validateImageUploadMeta({
        filename: 'foto.jpg',
        contentType: 'image/svg+xml',
        size: 400,
      }),
    ).toEqual({ ok: false, message: IMAGE_INVALID_FORMAT_MESSAGE })
  })

  it('aceita AVIF (Android 12+ / iOS 16+)', () => {
    expect(
      validateImageUploadMeta({
        filename: 'foto.avif',
        contentType: 'image/avif',
        size: 1 * 1024 * 1024,
      }),
    ).toEqual({ ok: true })
  })

  it('rejeita DNG do iPhone ProRAW com mensagem específica de RAW', () => {
    expect(
      validateImageUploadMeta({
        filename: 'IMG_5123.DNG',
        contentType: 'image/x-adobe-dng',
        size: 25 * 1024 * 1024,
      }),
    ).toEqual({ ok: false, message: IMAGE_RAW_FORMAT_MESSAGE })
  })

  it('rejeita DNG do Samsung modo Pro com MIME vazio', () => {
    expect(
      validateImageUploadMeta({
        filename: '20260514_103045.dng',
        contentType: '',
        size: 30 * 1024 * 1024,
      }),
    ).toEqual({ ok: false, message: IMAGE_RAW_FORMAT_MESSAGE })
  })

  it('rejeita outros RAWs de câmeras com mensagem específica', () => {
    expect(
      validateImageUploadMeta({
        filename: 'foto.cr2',
        contentType: 'application/octet-stream',
        size: 25 * 1024 * 1024,
      }),
    ).toEqual({ ok: false, message: IMAGE_RAW_FORMAT_MESSAGE })

    expect(
      validateImageUploadMeta({
        filename: 'foto.nef',
        contentType: '',
        size: 25 * 1024 * 1024,
      }),
    ).toEqual({ ok: false, message: IMAGE_RAW_FORMAT_MESSAGE })

    expect(
      validateImageUploadMeta({
        filename: 'foto.arw',
        contentType: 'image/x-sony-arw',
        size: 25 * 1024 * 1024,
      }),
    ).toEqual({ ok: false, message: IMAGE_RAW_FORMAT_MESSAGE })
  })

  it('detecta RAW pelo MIME mesmo com extensão desconhecida', () => {
    expect(
      isRawImageFormat({
        filename: 'export.bin',
        contentType: 'image/x-adobe-dng',
      }),
    ).toBe(true)
  })

  it('não classifica HEIC/AVIF/JPEG como RAW', () => {
    expect(isRawImageFormat({ filename: 'foto.heic', contentType: 'image/heic' })).toBe(false)
    expect(isRawImageFormat({ filename: 'foto.avif', contentType: 'image/avif' })).toBe(false)
    expect(isRawImageFormat({ filename: 'foto.jpg', contentType: 'image/jpeg' })).toBe(false)
  })

  it('mensagem RAW menciona ProRAW/Pro para guiar o usuário', () => {
    expect(IMAGE_RAW_FORMAT_MESSAGE).toContain('ProRAW')
    expect(IMAGE_RAW_FORMAT_MESSAGE).toContain('Pro')
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
