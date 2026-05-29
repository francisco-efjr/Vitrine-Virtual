import Link from 'next/link'
import { ListChecks, Check, List, Plus, ExternalLink, Store, Upload } from 'lucide-react'
import { IconHanger } from '@/components/brand/icon-hanger'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { CountUp, Reveal, Stagger } from '@/components/motion'
import { requireLojista } from '@/server/auth/session'
import { getDashboardMetrics } from '@/server/pecas/dashboard'
import { formatPreco } from '@/lib/validators/peca'
import { getCategoriaLabel } from '@/lib/categorias'
import { listOwnPecas } from '@/server/pecas/crud'

export const dynamic = 'force-dynamic'

const HORAS_PT = {
  manha: 'Bom dia',
  tarde: 'Boa tarde',
  noite: 'Boa noite',
} as const

function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return HORAS_PT.manha
  if (h < 18) return HORAS_PT.tarde
  return HORAS_PT.noite
}

export default async function DashboardPage() {
  const session = await requireLojista()
  const [metrics, pecasPage] = await Promise.all([
    getDashboardMetrics(session.loja.id, session.loja.cota_try_on_mensal),
    listOwnPecas(session.loja.id, { ordem: 'recentes', limit: 6 }),
  ])
  const pecas = pecasPage.items

  const cotaPct = Math.min(100, Math.round((metrics.try_ons_mes / metrics.cota_mensal) * 100))
  const nomeCurto = session.profile.nome_completo?.split(' ')[0] ?? 'lojista'

  // P0-02 (v6): empty state explícito.
  //
  // Antes, uma loja sem peças via 0/0/0 nos KPIs — visualmente indistinguível
  // de um bug de query (que existia: ver Dashboard_Bug no design v6, em que
  // contadores mostravam 0 mas "valor disponível" mostrava preço de UMA peça).
  //
  // Agora, quando metrics.pecas_total === 0, mostramos um banner de onboarding
  // com CTA grande para cadastrar a primeira peça, e os KPIs viram cards
  // "vazios" (— em ink-3), claramente diferentes de "0 numérico" — o que
  // sinaliza "ainda não cadastrei nada" em vez de "tenho peças mas algo
  // quebrou".
  const isEmpty = metrics.pecas_total === 0

  return (
    <div className="max-w-[920px] p-4 sm:p-7 lg:p-9">
      <Reveal>
        <header className="mb-1.5 flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-serif text-[26px] font-semibold tracking-tight text-ink sm:text-[28px]">
            {saudacao()}, {nomeCurto} 👋
          </h1>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/v/${session.loja.slug}`}
              target="_blank"
              title="Abrir a vitrine pública como o cliente vê"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 font-sans text-[12.5px] font-medium text-ink-2 transition hover:border-ink hover:text-ink"
            >
              <Store size={13} />
              Ver vitrine
              <ExternalLink size={10} className="opacity-60" />
            </Link>
          </div>
        </header>
        <p className="mb-6 font-sans text-[13.5px] text-ink-2">
          {isEmpty
            ? 'Nenhuma peça cadastrada ainda'
            : 'Sua vitrine está ativa · Atualizado agora'}
        </p>
      </Reveal>

      {isEmpty ? (
        <Reveal>
          <div
            className="mb-6 flex flex-col items-start gap-5 rounded-[14px] border-[1.5px] border-dashed border-border-2 bg-surface p-7 sm:flex-row sm:items-center sm:gap-6 sm:p-8"
            role="region"
            aria-label="Sua vitrine está esperando você"
          >
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] bg-surface-2"
              aria-hidden="true"
            >
              <IconHanger size={28} className="text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-serif text-[20px] font-semibold leading-snug tracking-tight text-ink">
                Sua vitrine está esperando você
              </div>
              <p className="mt-1 max-w-[420px] font-sans text-[13px] leading-relaxed text-ink-2">
                Adicione sua primeira peça e a vitrine já fica pronta pra suas clientes provarem.
              </p>
            </div>
            <Link
              href="/admin/pecas"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 font-sans text-[14px] font-medium text-white transition hover:bg-accent-dark active:scale-[0.98]"
            >
              <Upload size={15} />
              Adicionar primeira peça
            </Link>
          </div>
        </Reveal>
      ) : null}

      <Stagger className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-3" step={70}>
        <KpiCard
          label="Disponíveis"
          value={metrics.pecas_disponiveis}
          sub={isEmpty ? 'Sem peças' : 'peças na vitrine'}
          icon={<ListChecks size={17} />}
          empty={isEmpty}
        />
        <KpiCard
          label="Vendidas"
          value={metrics.pecas_vendidas}
          sub={isEmpty ? undefined : 'este mês'}
          icon={<Check size={17} />}
          empty={isEmpty}
        />
        <KpiCard
          label="Total"
          value={metrics.pecas_total}
          sub={isEmpty ? undefined : 'cadastradas'}
          icon={<List size={17} />}
          empty={isEmpty}
        />
      </Stagger>

      <Reveal delay={120}>
        <Card className="mb-6 p-5 sm:p-6">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <IconHanger size={15} className="text-accent" />
              <span className="font-sans text-sm font-medium text-ink">Consultas da cabine</span>
            </div>
            <Badge
              label={`${metrics.try_ons_mes} de ${metrics.cota_mensal} usos`}
              variant={cotaPct > 80 ? 'warning' : 'neutral'}
            />
          </div>
          <div className="mb-2 font-serif text-[26px] font-semibold leading-none tracking-tight text-ink">
            <CountUp value={metrics.try_ons_mes} />
            <span className="ml-1.5 font-sans text-[13px] font-normal text-ink-3">realizadas</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-warning"
              style={{
                width: `${cotaPct}%`,
                transition: 'width var(--t-cinematic) var(--e-out-soft)',
              }}
            />
          </div>
          <p className="mt-2 font-sans text-xs text-ink-3">
            {Math.max(0, metrics.cota_mensal - metrics.try_ons_mes)} restantes este mês.
          </p>
        </Card>
      </Reveal>

      <Stagger className="mb-7 grid gap-3.5 sm:grid-cols-2 lg:max-w-[560px]" step={80}>
        <Card className="p-5">
          <div className="mb-1 font-sans text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-3">
            Valor disponível
          </div>
          <div
            className={
              isEmpty
                ? 'font-serif text-[24px] font-semibold tracking-tight text-ink-3'
                : 'font-serif text-[24px] font-semibold tracking-tight text-ink'
            }
          >
            {isEmpty ? '—' : formatPreco(metrics.valor_disponivel_centavos) || '—'}
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-1 font-sans text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-3">
            Total vendido
          </div>
          <div
            className={
              isEmpty
                ? 'font-serif text-[24px] font-semibold tracking-tight text-ink-3'
                : 'font-serif text-[24px] font-semibold tracking-tight text-accent-dark'
            }
          >
            {isEmpty ? '—' : formatPreco(metrics.valor_vendido_centavos) || '—'}
          </div>
        </Card>
      </Stagger>

      <Reveal delay={140}>
        <div className="mb-8">
          <Link
            href="/admin/pecas"
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 font-sans text-[13.5px] font-medium text-white transition hover:bg-[#2d2825] active:scale-[0.98]"
          >
            <Plus size={14} />
            Cadastrar peça
          </Link>
        </div>
      </Reveal>

      <Reveal delay={180}>
        <div className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-3">
          Peças recentes
        </div>
        <Card>
          {pecas.slice(0, 6).map((p, i) => (
            <div key={p.id}>
              <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <div className="h-12 w-9 shrink-0 overflow-hidden rounded-md bg-surface-2 sm:h-14 sm:w-11">
                  {p.foto_principal_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.foto_principal_url}
                      alt=""
                      className="h-full w-full object-cover object-center"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-sans text-[13.5px] font-medium text-ink">
                    {p.nome}
                  </div>
                  <div className="mt-0.5 font-sans text-[11.5px] text-ink-3">
                    {[getCategoriaLabel(p.categoria_id), p.tamanho].filter(Boolean).join(' · ') ||
                      '—'}
                  </div>
                </div>
                <div className="shrink-0 font-serif text-[15px] font-semibold text-ink">
                  {formatPreco(p.preco_centavos) || '—'}
                </div>
                <Badge
                  label={p.status === 'disponivel' ? 'disponível' : 'vendida'}
                  variant={p.status}
                />
              </div>
              {i < Math.min(pecas.length, 6) - 1 ? (
                <div className="mx-4 h-px bg-border sm:mx-5" />
              ) : null}
            </div>
          ))}
          {pecas.length === 0 ? (
            <div className="p-8 text-center font-sans text-sm text-ink-3">
              Nenhuma peça cadastrada ainda.
            </div>
          ) : null}
        </Card>
      </Reveal>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  empty = false,
}: {
  label: string
  value: number
  sub?: string
  icon: React.ReactNode
  /**
   * P0-02 (v6): quando true, o valor é renderizado como em-dash ("—") em
   * ink-3, sinalizando "sem dado ainda" — visualmente distinto de "0",
   * que sugeriria um número real.
   */
  empty?: boolean
}) {
  return (
    <Card hoverable className="flex min-w-[130px] items-start justify-between p-5">
      <div>
        <div className="mb-2 font-sans text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-3">
          {label}
        </div>
        <div
          className={
            empty
              ? 'font-serif text-[28px] font-semibold leading-none tracking-tight text-ink-3'
              : 'font-serif text-[28px] font-semibold leading-none tracking-tight text-ink'
          }
          aria-label={empty ? `${label}: sem dados ainda` : undefined}
        >
          {empty ? '—' : <CountUp value={value} />}
        </div>
        {sub ? <div className="mt-1.5 font-sans text-[11.5px] text-ink-3">{sub}</div> : null}
      </div>
      <div
        className={
          empty
            ? 'flex h-9 w-9 items-center justify-center rounded-[10px] bg-surface-2 text-ink-3 transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]'
            : 'flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent-light text-accent transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-rotate-3 hover:scale-[1.08]'
        }
      >
        {icon}
      </div>
    </Card>
  )
}
