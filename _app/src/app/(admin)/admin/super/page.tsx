import { Check, ListChecks, Sparkles, Store } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { CountUp } from '@/components/motion'
import { VVLogo } from '@/components/brand/vv-logo'
import { requireSuperAdmin } from '@/server/auth/session'
import { listLojasWithStats, SUPER_ADMIN_PAGE_SIZE } from '@/server/lojas/list'
import {
  getDefaultAiImageModel,
  getTryOnBudget,
  isTryOnEnabled,
} from '@/lib/try-on/kill-switch'
import { ContactAnalytics } from '@/components/admin/contact-analytics'
import { QualityDashboard } from '@/components/admin/quality-dashboard'
import { ScenariosDashboard } from '@/components/admin/scenarios-dashboard'
import { SuperAdminClient } from './super-client'

export const dynamic = 'force-dynamic'

export default async function SuperAdminPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const session = await requireSuperAdmin()
  const page = Math.max(1, Number.parseInt(searchParams.page ?? '1', 10) || 1)
  const offset = (page - 1) * SUPER_ADMIN_PAGE_SIZE
  const [lojasPage, killEnabled, budget, defaultAiModel] = await Promise.all([
    listLojasWithStats({ offset, limit: SUPER_ADMIN_PAGE_SIZE }),
    isTryOnEnabled(),
    getTryOnBudget(),
    getDefaultAiImageModel(),
  ])
  // KPIs no header agregam só a página atual — pra agregação geral, futuro
  // RPC `super_admin_kpis()` resolve sem trazer 50+ lojas pro Node.
  const lojas = lojasPage.items
  const totalPecas = lojas.reduce((a, l) => a + l.pecas_count, 0)
  const totalVendidas = lojas.reduce((a, l) => a + l.vendidas_count, 0)
  const totalTryOns = lojas.reduce((a, l) => a + l.try_ons_mes, 0)
  const estCost = (totalTryOns * budget.costPerGen).toFixed(2)

  const adminNome =
    session.profile.nome_completo?.split(' ')[0] ?? session.user.email.split('@')[0] ?? 'Admin'

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3 px-4 py-3 sm:px-7">
          <div className="flex items-center gap-3">
            <VVLogo size={20} />
            <div className="h-4 w-px bg-border" />
            <span className="font-sans text-[13px] font-semibold text-ink">Super-Admin</span>
            <Badge label={adminNome} variant="admin" />
          </div>
          <span className="hidden truncate font-sans text-[12.5px] text-ink-2 sm:inline">
            {session.user.email}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-7 sm:py-8">
        <h1 className="mb-5 font-serif text-[24px] font-semibold tracking-tight text-ink sm:text-[26px]">
          Visão geral da plataforma
        </h1>

        <section className="mb-7 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <KpiBlock
            label="Lojas ativas"
            value={lojas.filter((l) => l.ativa).length}
            sub={`de ${lojas.length} cadastradas`}
            icon={<Store size={17} />}
          />
          <KpiBlock
            label="Peças"
            value={totalPecas}
            sub="em todas as vitrines"
            icon={<ListChecks size={17} />}
          />
          <KpiBlock
            label="Vendidas"
            value={totalVendidas}
            sub="este mês"
            icon={<Check size={17} />}
          />
          <KpiBlock
            label="Cabines"
            value={totalTryOns}
            sub={`≈ US$ ${estCost} estimado`}
            icon={<Sparkles size={17} />}
          />
        </section>

        <ContactAnalytics
          lojas={lojas.map((l) => ({ id: l.id, nome: l.nome, contatos: l.contatos }))}
        />

        <QualityDashboard />

        <ScenariosDashboard />

        <SuperAdminClient
          initialLojas={lojas}
          pageInfo={{
            total: lojasPage.total,
            pageSize: lojasPage.limit,
            currentPage: page,
          }}
          initialKillEnabled={killEnabled}
          initialBudget={budget.budgetUsd}
          initialDefaultModel={defaultAiModel}
        />
      </main>
    </div>
  )
}

function KpiBlock({
  label,
  value,
  sub,
  icon,
}: {
  label: string
  value: number
  sub?: string
  icon?: React.ReactNode
}) {
  return (
    <Card hoverable className="flex min-w-[130px] items-start justify-between p-5">
      <div>
        <div className="mb-2 font-sans text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-3">
          {label}
        </div>
        <div className="font-serif text-[28px] font-semibold leading-none tracking-tight text-ink">
          <CountUp value={value} />
        </div>
        {sub ? <div className="mt-1.5 font-sans text-[11.5px] text-ink-3">{sub}</div> : null}
      </div>
      {icon ? (
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent-light text-accent">
          {icon}
        </div>
      ) : null}
    </Card>
  )
}
