import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import {
  getContactClickStatsByLoja,
  type ContactClickStats,
} from '@/server/analytics/contact-clicks'
import type { LojaRow } from '@/types/database'

export interface LojaWithStats extends LojaRow {
  pecas_count: number
  vendidas_count: number
  try_ons_mes: number
  contatos: ContactClickStats
}

export interface LojasPage {
  items: LojaWithStats[]
  total: number
  offset: number
  limit: number
}

export const SUPER_ADMIN_PAGE_SIZE = 20

/**
 * Lista lojas com estatísticas agregadas — paginado.
 *
 * Use no painel super-admin. Caller deve ter passado por requireSuperAdmin().
 * Retorna `{ items, total }` pra UI montar paginação numérica.
 */
export async function listLojasWithStats(
  opts: { offset?: number; limit?: number } = {},
): Promise<LojasPage> {
  const supabase = createServiceClient()
  const limit = Math.max(1, Math.min(100, opts.limit ?? SUPER_ADMIN_PAGE_SIZE))
  const offset = Math.max(0, opts.offset ?? 0)

  const [
    { count, error: countErr },
    { data: lojas, error },
  ] = await Promise.all([
    supabase.from('lojas').select('id', { count: 'exact', head: true }),
    supabase
      .from('lojas')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
  ])
  if (error) throw error
  if (countErr) throw countErr
  if (!lojas?.length) return { items: [], total: count ?? 0, offset, limit }

  // Stats em paralelo
  const ids = lojas.map((l) => l.id)

  // BUG-009: removida a chamada RPC try_on_uso_mes_atual (era feita só para a
  // 1ª loja e o resultado era descartado com `void`). Os try-ons do mês são
  // obtidos pela query direta abaixo, agregada por loja.
  const inicioMes = new Date()
  inicioMes.setUTCDate(1)
  inicioMes.setUTCHours(0, 0, 0, 0)
  const [pecasRes, { data: tryOnRows }] = await Promise.all([
    supabase.from('pecas').select('loja_id, status').in('loja_id', ids),
    supabase
      .from('try_on_uses')
      .select('loja_id, success')
      .in('loja_id', ids)
      .eq('success', true)
      .gte('created_at', inicioMes.toISOString()),
  ])

  const pecasMap = new Map<string, { total: number; vendidas: number }>()
  for (const p of pecasRes.data ?? []) {
    const cur = pecasMap.get(p.loja_id) ?? { total: 0, vendidas: 0 }
    cur.total++
    if (p.status === 'vendida') cur.vendidas++
    pecasMap.set(p.loja_id, cur)
  }

  const tryOnMap = new Map<string, number>()
  for (const t of tryOnRows ?? []) {
    tryOnMap.set(t.loja_id, (tryOnMap.get(t.loja_id) ?? 0) + 1)
  }

  const contatosMap = await getContactClickStatsByLoja(ids, 30)

  const items = lojas.map((l) => ({
    ...l,
    pecas_count: pecasMap.get(l.id)?.total ?? 0,
    vendidas_count: pecasMap.get(l.id)?.vendidas ?? 0,
    try_ons_mes: tryOnMap.get(l.id) ?? 0,
    contatos: contatosMap.get(l.id) ?? { instagram: 0, tiktok: 0, whatsapp: 0 },
  }))

  return { items, total: count ?? items.length, offset, limit }
}

// BUG-010: mutações setLojaAtiva / setLojaAiModel movidas para ./update.ts
// (list.ts deve conter apenas leitura — separação de responsabilidades).
