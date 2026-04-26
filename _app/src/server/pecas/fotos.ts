import 'server-only'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { fotoUploadSchema, type FotoUploadInput } from '@/lib/validators/peca'
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
