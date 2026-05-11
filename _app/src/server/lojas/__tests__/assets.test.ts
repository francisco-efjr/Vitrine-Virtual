import { describe, expect, it } from 'vitest'
import {
  buildLojaAssetPublicUrl,
  lojaAssetUploadSchema,
} from '../assets'

describe('lojaAssetUploadSchema', () => {
  const validPayload = {
    kind: 'logo' as const,
    filename: 'logo.png',
    contentType: 'image/png' as const,
    size: 4096,
    data_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA',
  }

  it('aceita payload de logo válido', () => {
    expect(lojaAssetUploadSchema.safeParse(validPayload).success).toBe(true)
  })

  it('aceita kind=provador_fundo', () => {
    expect(
      lojaAssetUploadSchema.safeParse({ ...validPayload, kind: 'provador_fundo' })
        .success,
    ).toBe(true)
  })

  it('rejeita mime não-suportado', () => {
    const parsed = lojaAssetUploadSchema.safeParse({
      ...validPayload,
      contentType: 'image/gif',
      data_url: 'data:image/gif;base64,AAAA',
    })
    expect(parsed.success).toBe(false)
  })

  it('rejeita kind inválido', () => {
    expect(
      lojaAssetUploadSchema.safeParse({ ...validPayload, kind: 'capa' }).success,
    ).toBe(false)
  })

  it('rejeita data_url sem prefixo base64', () => {
    expect(
      lojaAssetUploadSchema.safeParse({
        ...validPayload,
        data_url: 'iVBORw0KGgoAAAANSUhEUgAA',
      }).success,
    ).toBe(false)
  })

  it('rejeita imagem > 10 MB', () => {
    expect(
      lojaAssetUploadSchema.safeParse({ ...validPayload, size: 12 * 1024 * 1024 })
        .success,
    ).toBe(false)
  })
})

describe('buildLojaAssetPublicUrl', () => {
  it('retorna null para path vazio', () => {
    expect(buildLojaAssetPublicUrl(null)).toBeNull()
  })

  it('monta URL pública apontando para o bucket lojas-logos', () => {
    const url = buildLojaAssetPublicUrl('abc/logo-xyz.png') ?? ''
    expect(url).toMatch(/\/storage\/v1\/object\/public\/lojas-logos\/abc\/logo-xyz\.png$/)
  })
})
