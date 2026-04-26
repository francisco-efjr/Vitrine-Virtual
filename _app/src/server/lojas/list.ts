import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import type { LojaRow } from '@/types/database'

export interface LojaWithStats extends LojaRow {
  pecas_count: number
  vendidas_count: number
  try_ons_mes: number
}

/**
 * Lista todas as lojas com estatísticas agregadas.
 * Use no painel super-admin. Caller deve ter passado por requireSuperAdmin().
 */
export async function listLojasWithStats(): Promise<LojaWithStats[]> {
  const supabase = createServiceClient()

  const { data: lojas, error } = await supabase
    .from('lojas')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  if (!lojas?.length) return []

  // Stats em paralelo
  const ids = lojas.map((l) => l.id)
  const [pecasRes, tryOnRes] = await Promise.all([
    supabase.from('pecas').select('loja_id, status').in('loja_id', ids),
    supabase.rpc('try_on_uso_mes_atual', { p_loja_id: ids[0]! }), // placeholder — vamos chamar por loja
  ])

  // Como try_on_uso_mes_atual é por loja, preferimos query direta:
  const inicioMes = new Date()
  inicioMes.setUTCDate(1)
  inicioMes.setUTCHours(0, 0, 0, 0)
  const { data: tryOnRows } = await supabase
    .from('try_on_uses')
    .select('loja_id, success')
    .in('loja_id', ids)
    .eq('success', true)
    .gte('created_at', inicioMes.toISOString())

  void tryOnRes // suprime warning do exemplo de RPC

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

  return lojas.map((l) => ({
    ...l,
    pecas_count: pecasMap.get(l.id)?.total ?? 0,
    vendidas_count: pecasMap.get(l.id)?.vendidas ?? 0,
    try_ons_mes: tryOnMap.get(l.id) ?? 0,
  }))
}

export async function setLojaAtiva(lojaId: string, ativa: boolean): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase.from('lojas').update({ ativa }).eq('id', lojaId)
  if (error) throw error
}
