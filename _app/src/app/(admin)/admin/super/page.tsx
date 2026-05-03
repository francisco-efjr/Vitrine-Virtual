import { Plus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { requireSuperAdmin } from '@/server/auth/session'
import { listLojasWithStats } from '@/server/lojas/list'
import { getTryOnBudget, isTryOnEnabled } from '@/lib/try-on/kill-switch'
import { SuperAdminClient } from './super-client'

export const dynamic = 'force-dynamic'

export default async function SuperAdminPage() {
  await requireSuperAdmin()
  const [lojas, killEnabled, budget] = await Promise.all([
    listLojasWithStats(),
    isTryOnEnabled(),
    getTryOnBudget(),
  ])

  const totalPecas = lojas.reduce((a, l) => a + l.pecas_count, 0)
  const totalVendidas = lojas.reduce((a, l) => a + l.vendidas_count, 0)
  const totalTryOns = lojas.reduce((a, l) => a + l.try_ons_mes, 0)
  const estCost = (totalTryOns * budget.costPerGen).toFixed(2)

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface px-4 py-4 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-serif text-xl font-semibold">Super-admin</span>
            <Badge label="Francisco" variant="admin" />
          </div>
        </div>
      </header>
      <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-9">
        <h1 className="mb-4 font-serif text-[26px] font-semibold">Visão geral da plataforma</h1>
        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiBlock label="Lojas ativas" value={lojas.filter((l) => l.ativa).length} sub={`de ${lojas.length} cadastradas`} />
          <KpiBlock label="Peças na plataforma" value={totalPecas} sub="em todas as vitrines" />
          <KpiBlock label="Peças vendidas" value={totalVendidas} sub="total" color="success" />
          <KpiBlock
            label="Provadores no mês"
            value={totalTryOns}
            sub={`≈ US$ ${estCost} estimado`}
            color="warning"
          />
        </section>

        <SuperAdminClient
          initialLojas={lojas}
          initialKillEnabled={killEnabled}
          initialBudget={budget.budgetUsd}
        />
      </main>
    </div>
  )
}

function KpiBlock({
  label,
  value,
  sub,
  color = 'accent',
}: {
  label: string
  value: number | string
  sub?: string
  color?: 'accent' | 'success' | 'warning'
}) {
  const tone = {
    accent: 'text-ink',
    success: 'text-success',
    warning: 'text-warning',
  }[color]
  return (
    <Card className="p-5">
      <div className="mb-2 text-xs font-medium uppercase tracking-widest text-ink-3">{label}</div>
      <div className={`font-serif text-3xl font-semibold ${tone}`}>{value}</div>
      {sub ? <div className="mt-1.5 text-xs text-ink-3">{sub}</div> : null}
    </Card>
  )
}
