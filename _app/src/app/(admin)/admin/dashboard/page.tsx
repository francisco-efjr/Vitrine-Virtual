import Link from 'next/link'
import { ListChecks, Check, List, Sparkles, ExternalLink } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CountUp, Reveal, Stagger } from '@/components/motion'
import { requireLojista } from '@/server/auth/session'
import { getDashboardMetrics } from '@/server/pecas/dashboard'
import { formatPreco } from '@/lib/validators/peca'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await requireLojista()
  const metrics = await getDashboardMetrics(session.loja.id, session.loja.cota_try_on_mensal)

  const cotaPct = Math.min(100, Math.round((metrics.try_ons_mes / metrics.cota_mensal) * 100))
  const nomeCurto = session.profile.nome_completo?.split(' ')[0] ?? 'la'

  return (
    <div className="max-w-[960px] p-4 sm:p-6 lg:p-9">
      <Reveal>
        <header className="mb-7 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-[28px] font-semibold text-ink">
              Bom dia, {nomeCurto} 👋
            </h1>
            <p className="mt-1.5 text-sm text-ink-2">Sua vitrine está ativa · Atualizado agora</p>
          </div>
          <Link
            href={`/v/${session.loja.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-ink-2 transition hover:border-accent hover:text-accent"
          >
            <ExternalLink size={12} />
            Visualizar vitrine
          </Link>
        </header>
      </Reveal>

      <Stagger className="mb-7 grid grid-cols-2 gap-4 lg:grid-cols-4" step={70}>
        <KpiCard
          label="Disponíveis"
          value={metrics.pecas_disponiveis}
          sub="peças na vitrine"
          icon={<ListChecks size={18} />}
        />
        <KpiCard
          label="Vendidas"
          value={metrics.pecas_vendidas}
          sub="este mês"
          icon={<Check size={18} />}
          color="success"
        />
        <KpiCard label="Total" value={metrics.pecas_total} sub="cadastradas" icon={<List size={18} />} />
        <KpiCard
          label="Cabine"
          value={`${metrics.try_ons_mes}/${metrics.cota_mensal}`}
          sub="experimentações este mês"
          icon={<Sparkles size={18} />}
          color="warning"
          rawValue={null}
        />
      </Stagger>

      <Reveal delay={120}>
        <Card className="mb-5 p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-ink">Cota da Cabine</span>
            <Badge
              label={`${metrics.try_ons_mes} de ${metrics.cota_mensal} usos`}
              variant={cotaPct > 80 ? 'warning' : 'neutral'}
            />
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-warning"
              style={{
                width: `${cotaPct}%`,
                transition: 'width var(--t-cinematic) var(--e-out-soft)',
              }}
            />
          </div>
          <p className="mt-2 text-xs text-ink-3">
            {metrics.cota_mensal - metrics.try_ons_mes} usos restantes este mês.
          </p>
        </Card>
      </Reveal>

      <Stagger className="grid gap-4 sm:grid-cols-2 lg:max-w-[520px]" step={80}>
        <Card className="p-5">
          <div className="mb-1 text-xs uppercase tracking-widest text-ink-3">Valor disponível</div>
          <div className="font-serif text-2xl font-semibold">
            {formatPreco(metrics.valor_disponivel_centavos) || '—'}
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-1 text-xs uppercase tracking-widest text-ink-3">Total vendido</div>
          <div className="font-serif text-2xl font-semibold text-success">
            {formatPreco(metrics.valor_vendido_centavos) || '—'}
          </div>
        </Card>
      </Stagger>

      <Reveal delay={160}>
        <div className="mt-8">
          <Link
            href="/admin/pecas"
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-[18px] py-[9px] text-sm font-medium text-white transition active:scale-[0.98] hover:bg-[#2d2825]"
          >
            + Cadastrar peça
          </Link>
        </div>
      </Reveal>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  color = 'accent',
  rawValue,
}: {
  label: string
  value: React.ReactNode
  sub?: string
  icon: React.ReactNode
  color?: 'accent' | 'success' | 'warning'
  /**
   * Quando `value` é um número puro, passamos também aqui para animar com
   * CountUp. Se a coluna mostra algo composto (ex: "12/200"), passar `null`.
   */
  rawValue?: number | null
}) {
  const colorClasses = {
    accent: 'bg-accent-light text-accent',
    success: 'bg-success-light text-success',
    warning: 'bg-warning-light text-warning',
  } as const
  const numericValue =
    rawValue !== undefined ? rawValue : typeof value === 'number' ? value : null
  return (
    <Card hoverable className="flex min-w-[140px] items-start justify-between p-5">
      <div>
        <div className="mb-2 text-xs font-medium uppercase tracking-widest text-ink-3">{label}</div>
        <div className="font-serif text-3xl font-semibold leading-none">
          {numericValue != null ? <CountUp value={numericValue} /> : value}
        </div>
        {sub ? <div className="mt-1.5 text-xs text-ink-3">{sub}</div> : null}
      </div>
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-[10px] transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.08] hover:-rotate-3 ${colorClasses[color]}`}
      >
        {icon}
      </div>
    </Card>
  )
}
