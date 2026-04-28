import Link from 'next/link'
import { ListChecks, Check, List, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
    <div className="max-w-[900px] p-9">
      <header className="mb-7">
        <h1 className="font-serif text-[28px] font-semibold text-ink">
          Bom dia, {nomeCurto} 👋
        </h1>
        <p className="mt-1.5 text-sm text-ink-2">Sua vitrine está ativa · Atualizado agora</p>
      </header>

      <section className="mb-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
          label="Provador Virtual"
          value={`${metrics.try_ons_mes}/${metrics.cota_mensal}`}
          sub="usos este mês"
          icon={<Sparkles size={18} />}
          color="warning"
        />
      </section>

      <Card className="mb-5 p-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-ink">Cota do Provador Virtual</span>
          <Badge
            label={`${metrics.try_ons_mes} de ${metrics.cota_mensal} usos`}
            variant={cotaPct > 80 ? 'warning' : 'neutral'}
          />
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-warning transition-all"
            style={{ width: `${cotaPct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-ink-3">
          {metrics.cota_mensal - metrics.try_ons_mes} usos restantes este mês.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-[480px]">
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
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin/pecas"
          className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-[18px] py-[9px] text-sm font-medium text-white transition hover:bg-[#2d2825]"
        >
          + Cadastrar peça
        </Link>
        <Link
          href={`/v/${session.loja.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-[18px] py-[9px] text-sm font-medium text-ink transition hover:bg-surface-2"
        >
          Ver vitrine pública ↗
        </Link>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  color = 'accent',
}: {
  label: string
  value: React.ReactNode
  sub?: string
  icon: React.ReactNode
  color?: 'accent' | 'success' | 'warning'
}) {
  const colorClasses = {
    accent: 'bg-accent-light text-accent',
    success: 'bg-success-light text-success',
    warning: 'bg-warning-light text-warning',
  } as const
  return (
    <Card className="flex items-start justify-between p-5 min-w-[140px]">
      <div>
        <div className="mb-2 text-xs font-medium uppercase tracking-widest text-ink-3">{label}</div>
        <div className="font-serif text-3xl font-semibold leading-none">{value}</div>
        {sub ? <div className="mt-1.5 text-xs text-ink-3">{sub}</div> : null}
      </div>
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${colorClasses[color]}`}
      >
        {icon}
      </div>
    </Card>
  )
}
