'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, BarChart2, CheckCircle2, RefreshCw, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import type { QualityReport } from '@/server/try-on/calibrate'

type Period = 7 | 30 | 90

/**
 * Super-Admin · Qualidade da Cabine.
 *
 * Mostra approval rates por provider/modelo, razões de rejeição, eficácia do
 * gate e sugestões de calibração de threshold — tudo a partir do relatório
 * de qualidade computado em /api/super-admin/try-on/quality.
 */
export function QualityDashboard() {
  const [period, setPeriod] = useState<Period>(30)
  const [report, setReport] = useState<QualityReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchReport(p: Period) {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/super-admin/try-on/quality?days=${p}`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setReport(await r.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar relatório.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReport(period) }, [period])

  return (
    <section className="mb-8">
      <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-serif text-[20px] font-semibold tracking-tight text-ink">
            Qualidade da Cabine
          </h2>
          <p className="mt-0.5 font-sans text-[12.5px] text-ink-3">
            Aprovação, razões de rejeição e calibração de thresholds
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {([7, 30, 90] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-[7px] px-2.5 py-1 font-sans text-[11.5px] font-semibold transition-colors ${
                period === p
                  ? 'bg-ink text-surface'
                  : 'text-ink-3 hover:bg-surface-2 hover:text-ink-2'
              }`}
            >
              {p}d
            </button>
          ))}
          <button
            onClick={() => fetchReport(period)}
            disabled={loading}
            className="ml-1 flex h-7 w-7 items-center justify-center rounded-[7px] text-ink-3 hover:bg-surface-2 hover:text-ink-2 disabled:opacity-40"
            title="Atualizar"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error ? (
        <Card className="flex items-center gap-3 p-5 text-danger">
          <XCircle size={16} />
          <span className="font-sans text-[13.5px]">{error}</span>
        </Card>
      ) : loading && !report ? (
        <Card className="flex items-center justify-center gap-3 p-8 text-ink-3">
          <Spinner size={16} />
          <span className="font-sans text-[13.5px]">Carregando relatório…</span>
        </Card>
      ) : report ? (
        <div className="flex flex-col gap-5">
          <ProviderStatsSection report={report} />
          <div className="grid gap-5 lg:grid-cols-2">
            <FeedbackReasonsSection report={report} />
            <GateEffectivenessSection report={report} />
          </div>
          <ThresholdSuggestionsSection report={report} />
        </div>
      ) : null}
    </section>
  )
}

// ─── Provider stats ──────────────────────────────────────────────────────────

function ProviderStatsSection({ report }: { report: QualityReport }) {
  const stats = report.provider_stats
  if (!stats.length) return <EmptyCard label="Nenhuma geração registrada no período." />

  return (
    <Card className="overflow-hidden">
      <SectionHeader
        icon={<BarChart2 size={14} />}
        label="Aprovação por provider · modelo"
        sub={`${report.period_days} dias`}
      />
      <div className="hidden border-b border-border bg-bg px-5 py-2 sm:flex sm:px-6">
        {['Provider', 'Modelo', 'Total', 'c/ Feedback', 'Aprovação', 'Duração', 'Erros'].map(
          (h) => (
            <div
              key={h}
              className="flex-1 text-center font-sans text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-3 first:text-left"
            >
              {h}
            </div>
          ),
        )}
      </div>
      {stats.map((s, i) => {
        const rate = s.approval_rate_pct
        const rateColor =
          rate === null
            ? 'text-ink-3'
            : rate >= 80
              ? 'text-[#3d7a4a]'
              : rate >= 60
                ? 'text-[#8a6d20]'
                : 'text-danger'
        return (
          <div key={i}>
            <div className="flex flex-wrap items-center gap-y-1 px-5 py-3 sm:flex-nowrap sm:px-6">
              <div className="flex-1 font-mono text-[12.5px] font-semibold text-ink">
                {s.provider}
              </div>
              <div className="flex-1 text-center font-mono text-[11.5px] text-ink-2">
                {s.model_resolved === 'unknown' ? '—' : truncate(s.model_resolved, 22)}
              </div>
              <NumCell value={s.total} />
              <NumCell value={s.with_feedback} />
              <div className="flex-1 text-center">
                <span className={`font-serif text-[16px] font-semibold tabular-nums ${rateColor}`}>
                  {rate !== null ? `${rate}%` : '—'}
                </span>
              </div>
              <div className="flex-1 text-center font-sans text-[12.5px] text-ink-2 tabular-nums">
                {s.avg_duration_s !== null ? `${s.avg_duration_s}s` : '—'}
              </div>
              <NumCell value={s.errors} danger={s.errors > 0} />
            </div>
            {i < stats.length - 1 ? <div className="mx-5 h-px bg-border sm:mx-6" /> : null}
          </div>
        )
      })}
    </Card>
  )
}

// ─── Feedback reasons ────────────────────────────────────────────────────────

const REASON_LABEL: Record<string, string> = {
  face_didnt_look_like_me: 'Rosto não pareceu comigo',
  body_shape_changed: 'Corpo ficou diferente',
  clothing_looked_wrong: 'Peça ficou estranha',
  image_not_realistic: 'Imagem não ficou realista',
  background_looked_bad: 'Fundo ficou ruim',
  other: 'Outro',
  not_specified: 'Não especificado',
}

function FeedbackReasonsSection({ report }: { report: QualityReport }) {
  const reasons = report.feedback_reasons
  const maxCount = Math.max(...reasons.map((r) => r.count), 1)

  return (
    <Card className="overflow-hidden">
      <SectionHeader label="Razões de rejeição" sub="feedback negativo" />
      {!reasons.length ? (
        <EmptyInline label="Nenhum feedback negativo no período." />
      ) : (
        <div className="flex flex-col gap-0">
          {reasons.map((r, i) => (
            <div key={r.reason}>
              <div className="px-5 py-3 sm:px-6">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="font-sans text-[12.5px] text-ink">
                    {REASON_LABEL[r.reason] ?? r.reason}
                  </span>
                  <span className="font-sans text-[11.5px] tabular-nums text-ink-3">
                    {r.count} ({r.pct_of_negative?.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-ink-3 transition-all duration-500"
                    style={{ width: `${(r.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
              {i < reasons.length - 1 ? <div className="mx-5 h-px bg-border sm:mx-6" /> : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ─── Gate effectiveness ──────────────────────────────────────────────────────

const GATE_LABEL: Record<string, string> = {
  proceed: 'Aprovado',
  proceed_with_warning: 'Com aviso',
  reject: 'Rejeitado (soft)',
  not_evaluated: 'Sem gate',
}
const GATE_COLOR: Record<string, string> = {
  proceed: 'bg-[#4a8b58]',
  proceed_with_warning: 'bg-[#c49a20]',
  reject: 'bg-danger',
  not_evaluated: 'bg-ink-3',
}

function GateEffectivenessSection({ report }: { report: QualityReport }) {
  const stats = report.gate_effectiveness
  const maxTotal = Math.max(...stats.map((s) => s.total_with_feedback), 1)

  return (
    <Card className="overflow-hidden">
      <SectionHeader label="Eficácia do gate" sub="aprovação por veredito" />
      {!stats.length ? (
        <EmptyInline label="Sem dados de gate no período." />
      ) : (
        <div className="flex flex-col gap-0">
          {stats.map((s, i) => (
            <div key={s.gate_verdict}>
              <div className="px-5 py-3 sm:px-6">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${GATE_COLOR[s.gate_verdict] ?? 'bg-ink-3'}`}
                    />
                    <span className="font-sans text-[12.5px] text-ink">
                      {GATE_LABEL[s.gate_verdict] ?? s.gate_verdict}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-sans text-[11px] text-ink-3">
                      {s.total_with_feedback} amostras
                    </span>
                    <span
                      className={`font-serif text-[15px] font-semibold tabular-nums ${
                        (s.approval_rate_pct ?? 0) >= 75 ? 'text-[#3d7a4a]' : 'text-danger'
                      }`}
                    >
                      {s.approval_rate_pct !== null ? `${s.approval_rate_pct}%` : '—'}
                    </span>
                  </div>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-ink-3 transition-all duration-500"
                    style={{ width: `${(s.total_with_feedback / maxTotal) * 100}%` }}
                  />
                </div>
              </div>
              {i < stats.length - 1 ? <div className="mx-5 h-px bg-border sm:mx-6" /> : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ─── Threshold suggestions ───────────────────────────────────────────────────

const CONFIDENCE_BADGE: Record<string, string> = {
  low: 'neutral',
  medium: 'info',
  high: 'success',
}

function ThresholdSuggestionsSection({ report }: { report: QualityReport }) {
  const suggestions = report.threshold_suggestions
  if (!suggestions.length) return null

  return (
    <Card className="overflow-hidden">
      <SectionHeader
        icon={<AlertTriangle size={14} />}
        label="Calibração de thresholds"
        sub="sugestões baseadas em feedback real"
      />
      <div className="flex flex-col divide-y divide-border">
        {suggestions.map((s) => {
          const delta =
            s.suggested !== null && s.current > 0
              ? ((s.suggested - s.current) / s.current) * 100
              : null
          const hasDrift = delta !== null && Math.abs(delta) > 5

          return (
            <div key={s.signal} className="flex flex-wrap items-start gap-3 px-5 py-3.5 sm:px-6">
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex flex-wrap items-center gap-2">
                  <span className="font-sans text-[13px] font-semibold text-ink">{s.signal}</span>
                  <Badge
                    label={s.confidence}
                    // @ts-expect-error variant union
                    variant={CONFIDENCE_BADGE[s.confidence] ?? 'neutral'}
                  />
                  {s.sample_size > 0 ? (
                    <span className="font-sans text-[10.5px] text-ink-3">
                      {s.sample_size} amostras
                    </span>
                  ) : null}
                </div>
                <p className="font-sans text-[11.5px] leading-relaxed text-ink-2">{s.note}</p>
              </div>

              <div className="flex shrink-0 items-center gap-3 text-right">
                <div>
                  <div className="font-sans text-[10px] uppercase tracking-[0.06em] text-ink-3">
                    Atual
                  </div>
                  <div className="font-mono text-[14px] font-semibold text-ink">{s.current}</div>
                </div>
                {s.suggested !== null ? (
                  <>
                    <div className="text-ink-3">→</div>
                    <div>
                      <div className="font-sans text-[10px] uppercase tracking-[0.06em] text-ink-3">
                        Sugerido
                      </div>
                      <div
                        className={`font-mono text-[14px] font-semibold tabular-nums ${
                          hasDrift ? 'text-[#8a6d20]' : 'text-[#3d7a4a]'
                        }`}
                      >
                        {s.suggested}
                        {delta !== null ? (
                          <span className="ml-1 font-sans text-[10.5px] font-normal opacity-70">
                            {delta > 0 ? '+' : ''}
                            {delta.toFixed(0)}%
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="font-sans text-[12px] text-ink-3">sem sugestão</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="border-t border-border bg-bg px-5 py-3 sm:px-6">
        <p className="font-sans text-[11px] leading-relaxed text-ink-3">
          Sugestões são baseadas na mediana dos sinais para gerações aprovadas vs rejeitadas.
          Aplique com cautela: edite <code className="font-mono">quality-gate/thresholds.ts</code>{' '}
          e monitore o impacto por 7 dias antes de ajustar novamente.
        </p>
      </div>
    </Card>
  )
}

// ─── Acceptance correlation ──────────────────────────────────────────────────

// (Não exibido por enquanto — dado estará vazio até acceptance checks reais
//  serem todos wired. Componente pronto para habilitar.)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SectionHeader({
  label,
  sub,
  icon,
}: {
  label: string
  sub?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-border px-5 py-3.5 sm:px-6">
      {icon ? <span className="text-ink-3">{icon}</span> : null}
      <div>
        <div className="font-sans text-[13px] font-semibold text-ink">{label}</div>
        {sub ? <div className="font-sans text-[11px] text-ink-3">{sub}</div> : null}
      </div>
    </div>
  )
}

function EmptyCard({ label }: { label: string }) {
  return (
    <Card className="p-8 text-center font-sans text-[13px] text-ink-3">{label}</Card>
  )
}

function EmptyInline({ label }: { label: string }) {
  return (
    <div className="px-5 py-6 text-center font-sans text-[12.5px] text-ink-3 sm:px-6">{label}</div>
  )
}

function NumCell({ value, danger }: { value: number; danger?: boolean }) {
  return (
    <div
      className={`flex-1 text-center font-sans text-[13px] tabular-nums ${
        danger ? 'font-semibold text-danger' : 'text-ink-2'
      }`}
    >
      {value}
    </div>
  )
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n)}…` : s
}
