import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Scenarios dashboard data — research §4.3 P2.18.
 *
 * Fonte: view `try_on_scenarios_summary` (criada na migration 20260529000016).
 *
 * Não usa nada além das colunas JSONB já existentes em try_on_generations
 * (gate_signals + generation_params). Read-only, sem PII.
 */

export interface ScenarioDayRow {
  day: string
  total: number
  mirror_selfie_count: number
  conflicting_garment_count: number
  minor_estimated_count: number
  uncertain_age_count: number
  age_gate_blocked_count: number
  subject_count_fail_count: number
  anatomy_fail_count: number
  identity_fail_count: number
  color_fail_count: number
  text_fail_count: number
  pose_fail_count: number
  retry_picked_count: number
  retry_rejected_count: number
}

export interface ScenariosReport {
  periodDays: number
  totals: Omit<ScenarioDayRow, 'day'>
  byDay: ScenarioDayRow[]
}

const NUMERIC_KEYS: ReadonlyArray<keyof Omit<ScenarioDayRow, 'day'>> = [
  'total',
  'mirror_selfie_count',
  'conflicting_garment_count',
  'minor_estimated_count',
  'uncertain_age_count',
  'age_gate_blocked_count',
  'subject_count_fail_count',
  'anatomy_fail_count',
  'identity_fail_count',
  'color_fail_count',
  'text_fail_count',
  'pose_fail_count',
  'retry_picked_count',
  'retry_rejected_count',
]

function emptyTotals(): Omit<ScenarioDayRow, 'day'> {
  return NUMERIC_KEYS.reduce(
    (acc, k) => ({ ...acc, [k]: 0 }),
    {} as Omit<ScenarioDayRow, 'day'>,
  )
}

export async function computeScenariosReport(days = 30): Promise<ScenariosReport> {
  const supabase = createServiceClient()
  const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10)

  // Query a view via untyped from() — não está nos types ainda.
  const { data, error } = await (supabase as unknown as {
    from(name: string): {
      select(cols: string): {
        gte(col: string, val: string): {
          order(col: string, opts: { ascending: boolean }): Promise<{
            data: Record<string, unknown>[] | null
            error: { message: string } | null
          }>
        }
      }
    }
  })
    .from('try_on_scenarios_summary')
    .select('*')
    .gte('day', cutoff)
    .order('day', { ascending: false })

  if (error) {
    throw new Error(`scenarios: query falhou: ${error.message}`)
  }

  const rows: ScenarioDayRow[] = (data ?? []).map((row) => ({
    day: String(row.day),
    total: Number(row.total ?? 0),
    mirror_selfie_count: Number(row.mirror_selfie_count ?? 0),
    conflicting_garment_count: Number(row.conflicting_garment_count ?? 0),
    minor_estimated_count: Number(row.minor_estimated_count ?? 0),
    uncertain_age_count: Number(row.uncertain_age_count ?? 0),
    age_gate_blocked_count: Number(row.age_gate_blocked_count ?? 0),
    subject_count_fail_count: Number(row.subject_count_fail_count ?? 0),
    anatomy_fail_count: Number(row.anatomy_fail_count ?? 0),
    identity_fail_count: Number(row.identity_fail_count ?? 0),
    color_fail_count: Number(row.color_fail_count ?? 0),
    text_fail_count: Number(row.text_fail_count ?? 0),
    pose_fail_count: Number(row.pose_fail_count ?? 0),
    retry_picked_count: Number(row.retry_picked_count ?? 0),
    retry_rejected_count: Number(row.retry_rejected_count ?? 0),
  }))

  const totals = rows.reduce((acc, r) => {
    for (const k of NUMERIC_KEYS) {
      acc[k] = (acc[k] ?? 0) + (r[k] ?? 0)
    }
    return acc
  }, emptyTotals())

  return {
    periodDays: days,
    totals,
    byDay: rows,
  }
}
