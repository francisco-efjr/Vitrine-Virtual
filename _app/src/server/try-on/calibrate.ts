import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import {
  ACCEPTANCE_THRESHOLDS,
  CUSTOMER_PHOTO_THRESHOLDS,
} from '@/lib/try-on/quality-gate/thresholds'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProviderStat {
  provider: string
  model_resolved: string
  tier_effective: string
  total: number
  with_feedback: number
  approval_rate_pct: number | null
  avg_duration_s: number | null
  errors: number
}

export interface ReasonStat {
  reason: string
  count: number
  pct_of_negative: number
}

export interface GateStat {
  gate_verdict: string
  total_with_feedback: number
  positive: number
  negative: number
  approval_rate_pct: number | null
}

export interface AcceptanceStat {
  check_name: string
  passed: boolean
  total: number
  user_positive: number
  user_negative: number
  approval_rate_pct: number | null
}

export interface ThresholdSuggestion {
  signal: string
  current: number
  suggested: number | null
  /** Número de amostras usadas no cálculo. */
  sample_size: number
  confidence: 'low' | 'medium' | 'high'
  note: string
}

export interface QualityReport {
  generated_at: string
  period_days: number
  provider_stats: ProviderStat[]
  feedback_reasons: ReasonStat[]
  gate_effectiveness: GateStat[]
  acceptance_correlation: AcceptanceStat[]
  threshold_suggestions: ThresholdSuggestion[]
}

// ─── Main entry ─────────────────────────────────────────────────────────────

/**
 * Computa o relatório de qualidade da Cabine.
 *
 * Lê as views analíticas (migration 0014) e os signals brutos para sugerir
 * ajustes nos thresholds do quality gate.
 *
 * NUNCA bloqueia o fluxo — se qualquer query falhar retorna dados parciais.
 */
export async function computeQualityReport(periodDays = 30): Promise<QualityReport> {
  const supabase = createServiceClient()
  const since = new Date(Date.now() - periodDays * 86_400_000).toISOString()

  const [
    providerResult,
    reasonsResult,
    gateResult,
    acceptanceResult,
    signalResult,
  ] = await Promise.allSettled([
    supabase.from('try_on_quality_summary').select('*'),
    supabase.from('try_on_feedback_reasons').select('*'),
    supabase.from('try_on_gate_effectiveness').select('*'),
    supabase.from('try_on_acceptance_vs_feedback').select('*'),
    supabase
      .from('try_on_generations')
      .select('gate_signals, feedback_positivo')
      .not('gate_signals', 'is', null)
      .not('feedback_positivo', 'is', null)
      .gte('created_at', since)
      .limit(5000),
  ])

  const raw = signalResult.status === 'fulfilled' ? (signalResult.value.data ?? []) : []

  return {
    generated_at: new Date().toISOString(),
    period_days: periodDays,
    provider_stats:
      providerResult.status === 'fulfilled' ? (providerResult.value.data ?? []) : [],
    feedback_reasons:
      reasonsResult.status === 'fulfilled' ? (reasonsResult.value.data ?? []) : [],
    gate_effectiveness:
      gateResult.status === 'fulfilled' ? (gateResult.value.data ?? []) : [],
    acceptance_correlation:
      acceptanceResult.status === 'fulfilled' ? (acceptanceResult.value.data ?? []) : [],
    threshold_suggestions: computeThresholdSuggestions(raw),
  }
}

// ─── Threshold calibration ───────────────────────────────────────────────────

interface LabeledRow {
  signals: Record<string, unknown>
  positive: boolean
}

interface SignalDef {
  /** Chave no objeto `gate_signals.customer`. */
  key: string
  /** Label legível pro relatório. */
  label: string
  /** Threshold atual de referência. */
  current: number
  /**
   * 'higher_is_better': rejeitar abaixo do threshold (ex: sharpness, face area).
   * 'lower_is_better': rejeitar acima do threshold (ex: luminance máxima).
   */
  direction: 'higher_is_better' | 'lower_is_better'
}

const SIGNAL_DEFS: SignalDef[] = [
  {
    key: 'sharpness',
    label: 'Nitidez — reject (Laplacian variance)',
    current: CUSTOMER_PHOTO_THRESHOLDS.sharpness.reject,
    direction: 'higher_is_better',
  },
  {
    key: 'sharpness',
    label: 'Nitidez — warn',
    current: CUSTOMER_PHOTO_THRESHOLDS.sharpness.warn,
    direction: 'higher_is_better',
  },
  {
    key: 'meanLuminance',
    label: 'Luminância — mínima (imagem escura)',
    current: CUSTOMER_PHOTO_THRESHOLDS.luminance.hardReject.lo,
    direction: 'higher_is_better',
  },
  {
    key: 'meanLuminance',
    label: 'Luminância — máxima (superexposta)',
    current: CUSTOMER_PHOTO_THRESHOLDS.luminance.hardReject.hi,
    direction: 'lower_is_better',
  },
  {
    key: 'faceAreaFraction',
    label: 'Área do rosto (fraction)',
    current: CUSTOMER_PHOTO_THRESHOLDS.faceMinAreaFraction,
    direction: 'higher_is_better',
  },
  {
    key: 'targetRegionUnoccluded',
    label: 'Região-alvo desobstruída (fraction)',
    current: CUSTOMER_PHOTO_THRESHOLDS.targetRegionOcclusion.reject,
    direction: 'higher_is_better',
  },
]

/** Exportada para testes. Não faz IO — pura. */
export function computeThresholdSuggestions(
  rawRows: Array<{ gate_signals: unknown; feedback_positivo: boolean | null }>,
): ThresholdSuggestion[] {
  const labeled: LabeledRow[] = rawRows
    .filter(
      (r): r is { gate_signals: Record<string, unknown>; feedback_positivo: boolean } =>
        r.gate_signals != null &&
        typeof r.gate_signals === 'object' &&
        r.feedback_positivo !== null,
    )
    .map((r) => ({
      signals: (r.gate_signals as Record<string, unknown>)['customer'] as Record<string, unknown>,
      positive: r.feedback_positivo,
    }))
    .filter((r) => r.signals != null)

  if (labeled.length < 20) {
    return [
      {
        signal: 'todos os sinais',
        current: 0,
        suggested: null,
        sample_size: labeled.length,
        confidence: 'low',
        note: `Dados insuficientes para calibração (${labeled.length} amostras com feedback + sinais). Mínimo recomendado: 20.`,
      },
    ]
  }

  return SIGNAL_DEFS.map((def) => suggestThreshold(def, labeled))
}

function suggestThreshold(def: SignalDef, rows: LabeledRow[]): ThresholdSuggestion {
  const values = rows
    .map((r) => ({ value: r.signals[def.key], positive: r.positive }))
    .filter((r): r is { value: number; positive: boolean } => typeof r.value === 'number')

  if (values.length < 10) {
    return {
      signal: def.label,
      current: def.current,
      suggested: null,
      sample_size: values.length,
      confidence: 'low',
      note: `Poucos dados para "${def.key}" (${values.length} amostras). Sem sugestão.`,
    }
  }

  // Mediana do sinal para aprovados e rejeitados.
  const pos = values.filter((v) => v.positive).map((v) => v.value).sort((a, b) => a - b)
  const neg = values.filter((v) => !v.positive).map((v) => v.value).sort((a, b) => a - b)

  if (pos.length < 3 || neg.length < 3) {
    return {
      signal: def.label,
      current: def.current,
      suggested: null,
      sample_size: values.length,
      confidence: 'low',
      note: `Distribuição desequilibrada (${pos.length} positivos, ${neg.length} negativos). Sem sugestão.`,
    }
  }

  const medianPos = pos[Math.floor(pos.length / 2)]!
  const medianNeg = neg[Math.floor(neg.length / 2)]!

  // Threshold sugerido: ponto de equilíbrio entre as duas medianas.
  const suggested = Math.round(((medianPos + medianNeg) / 2) * 1000) / 1000

  const confidence: ThresholdSuggestion['confidence'] =
    values.length >= 100 ? 'high' : values.length >= 30 ? 'medium' : 'low'

  // Delta relativo ao threshold atual.
  const delta = def.current > 0 ? Math.abs(suggested - def.current) / def.current : 0
  const deltaStr = `${(delta * 100).toFixed(0)}%`

  const separation = Math.abs(medianPos - medianNeg)
  const separationNote =
    separation < def.current * 0.1
      ? 'Sinal tem baixo poder discriminativo para este threshold.'
      : 'Sinal discrimina bem aprovados de rejeitados.'

  const driftNote =
    delta > 0.15
      ? `⚠️ Sugestão difere ${deltaStr} do atual — rever antes de aplicar.`
      : delta > 0.05
        ? `Pequeno ajuste sugerido (${deltaStr}).`
        : 'Threshold parece bem calibrado.'

  return {
    signal: def.label,
    current: def.current,
    suggested,
    sample_size: values.length,
    confidence,
    note: `${driftNote} ${separationNote} (mediana aprovados: ${medianPos.toFixed(2)}, rejeitados: ${medianNeg.toFixed(2)})`,
  }
}

// ─── Identity check calibration ─────────────────────────────────────────────

/**
 * Calibra o threshold do dHash a partir da correlação entre
 * identitySimilarity.pass e feedback_reason = 'face_didnt_look_like_me'.
 *
 * Retorna a sugestão específica para IDENTITY_DHASH_PROXY_MIN, que pode ser
 * ajustada em acceptance/index.ts sem depender do ArcFace real.
 */
export async function calibrateDHashThreshold(): Promise<ThresholdSuggestion | null> {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('try_on_acceptance_vs_feedback')
    .select('*')
    .eq('check_name', 'identitySimilarity')

  if (!data || data.length < 2) return null

  // Quando check passa: qual a taxa de "face_didnt_look_like_me"?
  // Quando falha: deveria ser bem maior.
  // Essa função apenas informa; não toca no threshold diretamente.
  const pass = data.find((r) => r.passed === true)
  const fail = data.find((r) => r.passed === false)

  if (!pass && !fail) return null

  const passApproval = pass?.approval_rate_pct ?? null
  const failApproval = fail?.approval_rate_pct ?? null
  const discrimination =
    passApproval !== null && failApproval !== null
      ? passApproval - failApproval
      : null

  return {
    signal: 'Identity similarity (dHash proxy threshold)',
    current: 0.78, // IDENTITY_DHASH_PROXY_MIN de acceptance/index.ts
    suggested: null, // Não sugere valor sem dados de score contínuo
    sample_size: (pass?.total ?? 0) + (fail?.total ?? 0),
    confidence: discrimination !== null && Math.abs(discrimination) > 10 ? 'medium' : 'low',
    note:
      discrimination !== null
        ? `Check discrimina ${Math.abs(discrimination).toFixed(1)}pp de aprovação (pass: ${passApproval?.toFixed(1)}%, fail: ${failApproval?.toFixed(1)}%). ${
            discrimination < 5
              ? '⚠️ Baixa discriminação — threshold pode estar errado ou check não está capturando os casos certos.'
              : 'Boa discriminação.'
          }`
        : 'Dados insuficientes para avaliar discriminação.',
  }
}
