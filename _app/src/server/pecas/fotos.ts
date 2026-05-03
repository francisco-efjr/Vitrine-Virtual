import 'server-only'
import { IMAGE_MAX_UPLOAD_BYTES, validateImageUploadMeta } from '@/lib/images/upload'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import {
  fotoBase64UploadSchema,
  fotoUploadSchema,
  type FotoBase64UploadInput,
  type FotoUploadInput,
} from '@/lib/validators/peca'
import { getOwnPeca } from './crud'
import {
  FotoForaDaPecaError,
  FotoNaoEncontradaError,
  LimiteFotosExcedidoError,
  PecaError,
} from './errors'
import { logger } from '@/lib/logger'
import type { PecaFotoRow } from '@/types/database'

const MAX_FOTOS_POR_PECA = 8

const EXT_MAP: Record<FotoUploadInput['contentType'], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

interface FotoWithPreview extends PecaFotoRow {
  signed_url: string | null
  is_principal: boolean
}

export interface PecaFotoPreview {
  foto_principal_url: string | null
}

/**
 * Cria uma URL assinada para o cliente fazer upload direto ao Storage.
 * - Valida limite de fotos (8/peça).
 * - Gera path determinístico {loja_id}/{peca_id}/{uuid}.{ext}.
 * - Retorna URL + token + path para o cliente subir via PUT.
 *
 * Após o upload, o cliente DEVE chamar `confirmFotoUploaded` para criar
 * o registro em pecas_fotos.
 */
export async function createSignedUploadUrl(
  lojaId: string,
  pecaId: string,
  input: FotoUploadInput,
): Promise<{ path: string; token: string; ordem: number }> {
  const meta = fotoUploadSchema.parse(input)
  await getOwnPeca(lojaId, pecaId)

  const supabase = createServerSupabase()

  const { data: existing, error: countErr } = await supabase
    .from('pecas_fotos')
    .select('id, ordem')
    .eq('peca_id', pecaId)
    .order('ordem', { ascending: false })
  if (countErr) throw countErr
  if ((existing?.length ?? 0) >= MAX_FOTOS_POR_PECA) throw LimiteFotosExcedidoError()
  const proxOrdem = (existing?.[0]?.ordem ?? -1) + 1

  const ext = EXT_MAP[meta.contentType]
  const fileId = crypto.randomUUID()
  const path = `${lojaId}/${pecaId}/${fileId}.${ext}`

  const { data: signed, error } = await supabase.storage
    .from('pecas-fotos')
    .createSignedUploadUrl(path)

  if (error || !signed) {
    logger.error('Erro ao gerar URL assinada de upload', { code: error?.message })
    throw new PecaError('Falha ao gerar URL de upload', 'SIGN_FAIL', 500)
  }

  return { path, token: signed.token, ordem: proxOrdem }
}

export async function uploadFotoBase64(
  lojaId: string,
  pecaId: string,
  input: FotoBase64UploadInput,
): Promise<FotoWithPreview> {
  const data = fotoBase64UploadSchema.parse(input)
  const validation = validateImageUploadMeta({
    filename: data.filename,
    contentType: data.contentType,
    size: data.size,
  })
  if (!validation.ok) {
    throw new PecaError(validation.message, 'INVALID_IMAGE_UPLOAD', 400)
  }

  const peca = await getOwnPeca(lojaId, pecaId)
  const supabase = createServerSupabase()

  const { data: existing, error: countErr } = await supabase
    .from('pecas_fotos')
    .select('id')
    .eq('peca_id', pecaId)
  if (countErr) throw countErr
  if ((existing?.length ?? 0) >= MAX_FOTOS_POR_PECA) throw LimiteFotosExcedidoError()

  const fileBuffer = dataUrlToBuffer(data.data_url, data.contentType)
  if (fileBuffer.byteLength > IMAGE_MAX_UPLOAD_BYTES) {
    throw new PecaError('Falha ao processar foto', 'BAD_IMAGE_BUFFER', 400)
  }

  const ext = EXT_MAP[data.contentType]
  const fileId = crypto.randomUUID()
  const path = `${lojaId}/${pecaId}/${fileId}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('pecas-fotos')
    .upload(path, fileBuffer, {
      contentType: data.contentType,
      upsert: false,
    })

  if (uploadError) {
    logger.error('Erro ao subir foto base64', { code: uploadError.message })
    throw new PecaError('Falha ao salvar foto', 'UPLOAD_FAIL', 500)
  }

  const foto = await confirmFotoUploaded(lojaId, pecaId, path, data.ordem)

  const shouldBePrincipal = (existing?.length ?? 0) === 0 || peca.foto_principal_id == null
  if (shouldBePrincipal) {
    await setFotoPrincipal(lojaId, pecaId, foto.id)
  }

  const { data: signed } = await supabase.storage
    .from('pecas-fotos')
    .createSignedUrl(path, 3600)

  return {
    ...foto,
    signed_url: signed?.signedUrl ?? null,
    is_principal: shouldBePrincipal || peca.foto_principal_id === foto.id,
  }
}

/**
 * Confirma upload concluído: registra a foto em pecas_fotos.
 * Se for a primeira foto da peça, define como foto_principal automaticamente.
 */
export async function confirmFotoUploaded(
  lojaId: string,
  pecaId: string,
  storagePath: string,
  ordem: number,
): Promise<PecaFotoRow> {
  await getOwnPeca(lojaId, pecaId)

  // valida que o path bate com a estrutura esperada
  if (!storagePath.startsWith(`${lojaId}/${pecaId}/`)) {
    throw new PecaError('Path inválido', 'INVALID_PATH', 400)
  }

  const supabase = createServerSupabase()
  const { data: foto, error } = await supabase
    .from('pecas_fotos')
    .insert({ peca_id: pecaId, storage_path: storagePath, ordem })
    .select('*')
    .single()

  if (error || !foto) {
    logger.error('Erro ao registrar foto', { code: error?.message })
    throw new PecaError('Falha ao registrar foto', 'CONFIRM_FAIL', 500)
  }

  // Se é a primeira foto, definir como principal
  const { count } = await supabase
    .from('pecas_fotos')
    .select('id', { count: 'exact', head: true })
    .eq('peca_id', pecaId)
  if (count === 1) {
    await supabase.from('pecas').update({ foto_principal_id: foto.id }).eq('id', pecaId)
  }

  return foto
}

export async function setFotoPrincipal(
  lojaId: string,
  pecaId: string,
  fotoId: string,
): Promise<void> {
  await getOwnPeca(lojaId, pecaId)
  const supabase = createServerSupabase()

  const { data: foto } = await supabase
    .from('pecas_fotos')
    .select('id, peca_id')
    .eq('id', fotoId)
    .maybeSingle()
  if (!foto) throw FotoNaoEncontradaError()
  if (foto.peca_id !== pecaId) throw FotoForaDaPecaError()

  const { error } = await supabase
    .from('pecas')
    .update({ foto_principal_id: fotoId })
    .eq('id', pecaId)
    .eq('loja_id', lojaId)
  if (error) throw new PecaError('Falha ao definir foto principal', 'SET_MAIN_FAIL', 500)
}

export async function deleteFoto(lojaId: string, pecaId: string, fotoId: string): Promise<void> {
  await getOwnPeca(lojaId, pecaId)
  const supabase = createServerSupabase()

  const { data: foto } = await supabase
    .from('pecas_fotos')
    .select('id, peca_id, storage_path')
    .eq('id', fotoId)
    .maybeSingle()
  if (!foto) throw FotoNaoEncontradaError()
  if (foto.peca_id !== pecaId) throw FotoForaDaPecaError()

  // Limpa o blob do storage
  await supabase.storage
    .from('pecas-fotos')
    .remove([foto.storage_path])
    .catch((e) => logger.warn('Falha ao remover blob', { code: String(e) }))

  const { error } = await supabase.from('pecas_fotos').delete().eq('id', fotoId)
  if (error) throw new PecaError('Falha ao deletar foto', 'DELETE_FOTO_FAIL', 500)

  // Se era a foto principal, escolher outra (ou null)
  const { data: peca } = await supabase
    .from('pecas')
    .select('foto_principal_id')
    .eq('id', pecaId)
    .single()

  if (peca?.foto_principal_id === fotoId) {
    const { data: outra } = await supabase
      .from('pecas_fotos')
      .select('id')
      .eq('peca_id', pecaId)
      .order('ordem', { ascending: true })
      .limit(1)
      .maybeSingle()
    await supabase
      .from('pecas')
      .update({ foto_principal_id: outra?.id ?? null })
      .eq('id', pecaId)
  }
}

export async function getPecaPreviewUrl(
  pecaId: string,
  ttlSeconds = 3600,
): Promise<string | null> {
  const supabase = createServerSupabase()
  const { data: peca, error } = await supabase
    .from('pecas')
    .select('foto_principal_id')
    .eq('id', pecaId)
    .maybeSingle()

  if (error) throw error
  if (!peca?.foto_principal_id) return null

  const { data: foto, error: fotoError } = await supabase
    .from('pecas_fotos')
    .select('storage_path')
    .eq('id', peca.foto_principal_id)
    .maybeSingle()
  if (fotoError) throw fotoError
  if (!foto?.storage_path) return null

  const { data: signed, error: signedError } = await supabase.storage
    .from('pecas-fotos')
    .createSignedUrl(foto.storage_path, ttlSeconds)

  if (signedError) {
    logger.warn('Falha ao gerar preview da foto principal', { code: signedError.message })
    return null
  }

  return signed?.signedUrl ?? null
}

function dataUrlToBuffer(dataUrl: string, contentType: FotoUploadInput['contentType']): Buffer {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/)
  if (!match) {
    throw new PecaError('data_url inválido', 'INVALID_DATA_URL', 400)
  }

  const mime = match[1] as FotoUploadInput['contentType']
  const base64 = match[2]
  if (!base64) {
    throw new PecaError('data_url inválido', 'INVALID_DATA_URL', 400)
  }
  if (mime !== contentType) {
    throw new PecaError('MIME da foto não confere com o payload', 'MIME_MISMATCH', 400)
  }

  try {
    return Buffer.from(base64, 'base64')
  } catch {
    throw new PecaError('Falha ao decodificar foto', 'BAD_BASE64', 400)
  }
}
