import 'server-only'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import {
  pecaCreateSchema,
  pecaUpdateSchema,
  type PecaCreateInput,
  type PecaUpdateInput,
} from '@/lib/validators/peca'
import { logger } from '@/lib/logger'
import { PecaError, PecaNaoEncontradaError } from './errors'
import { getPecaPreviewUrl } from './fotos'
import type { PecaRow } from '@/types/database'

export interface ListPecasOptions {
  somenteDisponiveis?: boolean
  busca?: string
  ordem?: 'recentes' | 'antigas'
  /** Tamanho de página. Default 30. */
  limit?: number
  /** Offset (0-based). Default 0. */
  offset?: number
}

export interface PecaListItem extends PecaRow {
  foto_principal_url: string | null
}

export interface PecaListPage {
  items: PecaListItem[]
  total: number
  offset: number
  limit: number
}

export const PECAS_ADMIN_PAGE_SIZE = 30

/**
 * Lista paginada das peças da loja.
 *
 * Retorna `{ items, total }` pra UI montar "X-Y de Z peças" + paginação
 * numérica. O `total` faz um count separado (mais um round-trip mas barato:
 * indexes em (loja_id, status) cobrem a query).
 */
export async function listOwnPecas(
  lojaId: string,
  opts: ListPecasOptions = {},
): Promise<PecaListPage> {
  const limit = Math.max(1, Math.min(100, opts.limit ?? PECAS_ADMIN_PAGE_SIZE))
  const offset = Math.max(0, opts.offset ?? 0)
  const supabase = createServerSupabase()

  // Count exact (sem head: true) pra UI calcular total de páginas
  let countQuery = supabase
    .from('pecas')
    .select('id', { count: 'exact', head: true })
    .eq('loja_id', lojaId)
  if (opts.somenteDisponiveis) countQuery = countQuery.eq('status', 'disponivel')
  if (opts.busca) countQuery = countQuery.ilike('nome', `%${opts.busca}%`)

  let dataQuery = supabase.from('pecas').select('*').eq('loja_id', lojaId)
  if (opts.somenteDisponiveis) dataQuery = dataQuery.eq('status', 'disponivel')
  if (opts.busca) dataQuery = dataQuery.ilike('nome', `%${opts.busca}%`)
  dataQuery = dataQuery
    .order('created_at', { ascending: opts.ordem === 'antigas' })
    .range(offset, offset + limit - 1)

  const [{ count, error: countErr }, { data, error }] = await Promise.all([
    countQuery,
    dataQuery,
  ])
  if (error) throw error
  if (countErr) throw countErr

  const items = await Promise.all(
    (data ?? []).map(async (peca) => ({
      ...peca,
      foto_principal_url: await getPecaPreviewUrl(peca.id),
    })),
  )

  return { items, total: count ?? items.length, offset, limit }
}

export async function getOwnPeca(lojaId: string, pecaId: string): Promise<PecaRow> {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('pecas')
    .select('*')
    .eq('id', pecaId)
    .eq('loja_id', lojaId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw PecaNaoEncontradaError()
  return data
}

export async function createPeca(lojaId: string, input: PecaCreateInput): Promise<PecaRow> {
  const data = pecaCreateSchema.parse(input)
  const supabase = createServerSupabase()
  const { data: created, error } = await supabase
    .from('pecas')
    .insert({ ...data, loja_id: lojaId })
    .select('*')
    .single()
  if (error || !created) {
    logger.error('Erro ao criar peça', { code: error?.message })
    throw new PecaError('Falha ao criar peça', 'INSERT_FAIL', 500)
  }
  return created
}

export async function updatePeca(
  lojaId: string,
  pecaId: string,
  input: PecaUpdateInput,
): Promise<PecaRow> {
  const data = pecaUpdateSchema.parse(input)
  // Garante que a peça existe e pertence à loja (RLS já protege, mas erro explícito é melhor)
  await getOwnPeca(lojaId, pecaId)

  const supabase = createServerSupabase()
  const { data: updated, error } = await supabase
    .from('pecas')
    .update(data)
    .eq('id', pecaId)
    .eq('loja_id', lojaId)
    .select('*')
    .single()
  if (error || !updated) {
    logger.error('Erro ao atualizar peça', { code: error?.message })
    throw new PecaError('Falha ao atualizar peça', 'UPDATE_FAIL', 500)
  }
  return updated
}

export async function markPecaVendida(lojaId: string, pecaId: string): Promise<PecaRow> {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('pecas')
    .update({ status: 'vendida', vendida_em: new Date().toISOString() })
    .eq('id', pecaId)
    .eq('loja_id', lojaId)
    .select('*')
    .single()
  if (error || !data) {
    if (error?.code === 'PGRST116') throw PecaNaoEncontradaError()
    throw new PecaError('Falha ao marcar como vendida', 'MARK_SOLD_FAIL', 500)
  }
  return data
}

export async function reabrirPeca(lojaId: string, pecaId: string): Promise<PecaRow> {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('pecas')
    .update({ status: 'disponivel', vendida_em: null })
    .eq('id', pecaId)
    .eq('loja_id', lojaId)
    .select('*')
    .single()
  if (error || !data) {
    if (error?.code === 'PGRST116') throw PecaNaoEncontradaError()
    throw new PecaError('Falha ao reabrir peça', 'REOPEN_FAIL', 500)
  }
  return data
}

export async function deletePeca(lojaId: string, pecaId: string): Promise<void> {
  // Garante que a peça pertence à loja
  await getOwnPeca(lojaId, pecaId)
  const supabase = createServerSupabase()

  // Storage cleanup é feito antes do delete (cascade no banco apaga as linhas, mas não os blobs)
  const { data: fotos } = await supabase
    .from('pecas_fotos')
    .select('storage_path')
    .eq('peca_id', pecaId)

  if (fotos?.length) {
    await supabase.storage
      .from('pecas-fotos')
      .remove(fotos.map((f) => f.storage_path))
      .catch((e) => logger.warn('Falha ao remover fotos do storage', { code: String(e) }))
  }

  const { error } = await supabase.from('pecas').delete().eq('id', pecaId).eq('loja_id', lojaId)
  if (error) {
    logger.error('Erro ao deletar peça', { code: error.message })
    throw new PecaError('Falha ao deletar peça', 'DELETE_FAIL', 500)
  }
}
