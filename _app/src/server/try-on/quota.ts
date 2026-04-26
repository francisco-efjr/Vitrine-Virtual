import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Camada 3 anti-abuso (ADR 0004): cota mensal por loja.
 *
 * Conta try-ons bem-sucedidos no mês corrente (UTC) e compara com cota_try_on_mensal.
 */
export interface QuotaCheck {
  ok: boolean
  used: number
  limit: number
  remaining: number
}

export async function checkLojaQuota(lojaId: string, limit: number): Promise<QuotaCheck> {
  const supabase = createServiceClient()
  const { data, error } = await supabase.rpc('try_on_uso_mes_atual', { p_loja_id: lojaId })
  if (error) throw error
  const used = data ?? 0
  return {
    ok: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  }
}
