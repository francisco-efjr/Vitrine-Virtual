'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import type { ScenariosReport } from '@/server/try-on/scenarios'

type Period = 7 | 30 | 90

/**
 * Super-Admin · Cenários da Cabine (P2.18).
 *
 * Mostra contagem agregada de cenários (mirror selfie, conflicting garment,
 * age gate, etc.) e flags de acceptance falhando — base pra calibrar
 * thresholds e priorizar próximos rounds de qualidade.
 */
export function ScenariosDashboard() {
  const [period, setPeriod] = useState<Period>(30)
  const [report, setReport] = useState<ScenariosReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchReport(p: Period) {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/super-admin/try-on/scenarios?days=${p}`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setReport(await r.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar relatório.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchReport(period)
  }, [period])

  return (
    <section className="mt-7">
      <header className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-[18px] font-semibold tracking-tight text-ink">
            Cenários da Cabine
          </h2>
          <p className="font-sans text-[12.5px] text-ink-3">
            Distribuição de cenários e flags ao longo do tempo (P2.18)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {([7, 30, 90] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-[10px] border border-border px-2.5 py-1 font-sans text-[11.5px] transition-colors ${
                period === p ? 'bg-accent-light text-accent' : 'bg-surface text-ink-2 hover:bg-bg'
              }`}
            >
              {p}d
            </button>
          ))}
          <button
            type="button"
            onClick={() => fetchReport(period)}
            className="rounded-[10px] border border-border bg-surface p-1.5 text-ink-2 hover:bg-bg"
            aria-label="Recarregar"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </header>

      {loading ? (
        <Card className="flex items-center gap-2 p-5 font-sans text-[12.5px] text-ink-3">
          <Spinner size={14} /> Carregando…
        </Card>
      ) : error ? (
        <Card className="flex items-center gap-2 p-5 font-sans text-[12.5px] text-red-600">
          <AlertTriangle size={13} /> {error}
        </Card>
      ) : report ? (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-3 font-sans text-[12.5px] font-semibold text-ink-2">
              Totais no período ({report.totals.total} gerações)
            </h3>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Mirror selfie" value={report.totals.mirror_selfie_count} />
              <Stat
                label="Peça conflitante"
                value={report.totals.conflicting_garment_count}
              />
              <Stat label="Possível menor" value={report.totals.minor_estimated_count} />
              <Stat label="Idade incerta" value={report.totals.uncertain_age_count} />
              <Stat label="Bloqueios LGPD" value={report.totals.age_gate_blocked_count} />
              <Stat
                label="Subject count fail"
                value={report.totals.subject_count_fail_count}
              />
              <Stat label="Anatomy fail" value={report.totals.anatomy_fail_count} />
              <Stat label="Identity fail" value={report.totals.identity_fail_count} />
              <Stat label="Color fail" value={report.totals.color_fail_count} />
              <Stat label="Text fail" value={report.totals.text_fail_count} />
              <Stat label="Pose fail" value={report.totals.pose_fail_count} />
              <Stat label="Retries picked" value={report.totals.retry_picked_count} />
            </div>
          </Card>

          {report.byDay.length > 0 ? (
            <Card className="overflow-x-auto p-5">
              <h3 className="mb-3 font-sans text-[12.5px] font-semibold text-ink-2">
                Por dia
              </h3>
              <table className="w-full font-sans text-[11.5px]">
                <thead>
                  <tr className="border-b border-border text-left text-ink-3">
                    <th className="py-1.5 pr-3">Dia</th>
                    <th className="py-1.5 pr-3 text-right">Total</th>
                    <th className="py-1.5 pr-3 text-right">Mirror</th>
                    <th className="py-1.5 pr-3 text-right">Conflito</th>
                    <th className="py-1.5 pr-3 text-right">Idade ?</th>
                    <th className="py-1.5 pr-3 text-right">Anatomy</th>
                    <th className="py-1.5 pr-3 text-right">Identity</th>
                    <th className="py-1.5 pr-3 text-right">Color</th>
                    <th className="py-1.5 pr-3 text-right">Text</th>
                    <th className="py-1.5 pr-3 text-right">Pose</th>
                    <th className="py-1.5 pr-3 text-right">Retry✓</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byDay.map((row) => (
                    <tr key={row.day} className="border-b border-border/40">
                      <td className="py-1.5 pr-3 text-ink-2">{row.day}</td>
                      <td className="py-1.5 pr-3 text-right text-ink">{row.total}</td>
                      <td className="py-1.5 pr-3 text-right text-ink">{row.mirror_selfie_count}</td>
                      <td className="py-1.5 pr-3 text-right text-ink">
                        {row.conflicting_garment_count}
                      </td>
                      <td className="py-1.5 pr-3 text-right text-ink">
                        {row.minor_estimated_count + row.uncertain_age_count}
                      </td>
                      <td className="py-1.5 pr-3 text-right text-ink">{row.anatomy_fail_count}</td>
                      <td className="py-1.5 pr-3 text-right text-ink">{row.identity_fail_count}</td>
                      <td className="py-1.5 pr-3 text-right text-ink">{row.color_fail_count}</td>
                      <td className="py-1.5 pr-3 text-right text-ink">{row.text_fail_count}</td>
                      <td className="py-1.5 pr-3 text-right text-ink">{row.pose_fail_count}</td>
                      <td className="py-1.5 pr-3 text-right text-ink">{row.retry_picked_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2 rounded-[10px] border border-border bg-surface px-3 py-2">
      <span className="font-sans text-[11.5px] text-ink-3">{label}</span>
      <span className="font-serif text-[16px] font-semibold text-ink">{value}</span>
    </div>
  )
}
