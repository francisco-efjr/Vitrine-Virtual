import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'

/**
 * Camada 4 anti-abuso (ADR 0004): kill switch global do provador IA.
 * Lê system_settings.try_on_enabled.
 *
 * Cron diário (a ser implementado no Vercel Cron / GitHub Actions) desliga
 * automaticamente quando o gasto acumulado passa do TRY_ON_MONTHLY_BUDGET_USD.
 */
export async function isTryOnEnabled(): Promise<boolean> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'try_on_enabled')
    .maybeSingle()

  if (error) {
    logger.error('Erro ao ler kill switch', { code: error.message })
    // Fail-closed: se não conseguimos ler, não autoriza.
    return false
  }
  return data?.value === true
}

export async function setTryOnEnabled(enabled: boolean, byUserId?: string): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase.from('system_settings').upsert({
    key: 'try_on_enabled',
    value: enabled,
    updated_by: byUserId,
  })
  if (error) throw error
  logger.info('Kill switch alterado', { enabled, by: byUserId })
}

export async function getTryOnBudget(): Promise<{ budgetUsd: number; costPerGen: number }> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', ['try_on_monthly_budget_usd', 'try_on_cost_per_generation_usd'])
  const map = new Map((data ?? []).map((d) => [d.key, d.value as number]))
  return {
    budgetUsd: map.get('try_on_monthly_budget_usd') ?? 100,
    costPerGen: map.get('try_on_cost_per_generation_usd') ?? 0.06,
  }
}
