import 'server-only'
import { createClient as createServerSupabase } from '@/lib/supabase/server'

export interface DashboardMetrics {
  pecas_disponiveis: number
  pecas_vendidas: number
  pecas_total: number
  valor_disponivel_centavos: number
  valor_vendido_centavos: number
  try_ons_mes: number
  cota_mensal: number
}

/** Métricas agregadas para o dashboard da loja logada. */
export async function getDashboardMetrics(
  lojaId: string,
  cotaMensal: number,
): Promise<DashboardMetrics> {
  const supabase = createServerSupabase()

  const { data: pecas, error } = await supabase
    .from('pecas')
    .select('status, preco_centavos')
    .eq('loja_id', lojaId)
  if (error) throw error

  let disponiveis = 0
  let vendidas = 0
  let valorDisp = 0
  let valorVend = 0
  for (const p of pecas ?? []) {
    if (p.status === 'disponivel') {
      disponiveis++
      valorDisp += p.preco_centavos ?? 0
    } else {
      vendidas++
      valorVend += p.preco_centavos ?? 0
    }
  }

  const inicioMes = new Date()
  inicioMes.setUTCDate(1)
  inicioMes.setUTCHours(0, 0, 0, 0)
  const { count: tryOnsMes } = await supabase
    .from('try_on_uses')
    .select('id', { count: 'exact', head: true })
    .eq('loja_id', lojaId)
    .eq('success', true)
    .gte('created_at', inicioMes.toISOString())

  return {
    pecas_disponiveis: disponiveis,
    pecas_vendidas: vendidas,
    pecas_total: disponiveis + vendidas,
    valor_disponivel_centavos: valorDisp,
    valor_vendido_centavos: valorVend,
    try_ons_mes: tryOnsMes ?? 0,
    cota_mensal: cotaMensal,
  }
}
