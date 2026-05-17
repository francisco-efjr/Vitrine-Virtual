import { Card } from '@/components/ui/card'
import type { ContactClickStats } from '@/server/analytics/contact-clicks'

/**
 * Super-Admin · Intenção de contato.
 *
 * Reproduz a seção "Intenção de contato" do handoff (Vitrine Virtual.html):
 *   - 3 KPI cards por canal (total + loja top)
 *   - lista de lojas ranqueada com barra empilhada de mix de canais
 * Estética black/white/neutral pedida no briefing — sem cores saturadas.
 */

type Channel = 'instagram' | 'tiktok' | 'whatsapp'

const CH_LABEL: Record<Channel, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp',
}
const CH_COLOR: Record<Channel, string> = {
  instagram: '#1e1a17',
  tiktok: '#9b8870',
  whatsapp: '#6d6460',
}
const CHANNELS: Channel[] = ['instagram', 'tiktok', 'whatsapp']

interface LojaContato {
  id: string
  nome: string
  contatos: ContactClickStats
}

function totalOf(c: ContactClickStats): number {
  return c.instagram + c.tiktok + c.whatsapp
}

export function ContactAnalytics({ lojas }: { lojas: LojaContato[] }) {
  const totals: ContactClickStats = { instagram: 0, tiktok: 0, whatsapp: 0 }
  const top: Record<Channel, { nome: string | null; v: number }> = {
    instagram: { nome: null, v: 0 },
    tiktok: { nome: null, v: 0 },
    whatsapp: { nome: null, v: 0 },
  }
  for (const l of lojas) {
    for (const ch of CHANNELS) {
      const v = l.contatos[ch] ?? 0
      totals[ch] += v
      if (v > top[ch].v) top[ch] = { nome: l.nome, v }
    }
  }
  const totalGeral = totalOf(totals)
  const ranked = [...lojas]
    .map((l) => ({ loja: l, total: totalOf(l.contatos) }))
    .sort((a, b) => b.total - a.total)
  const maxTotal = ranked[0]?.total || 1

  return (
    <section className="mb-8">
      <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-serif text-[20px] font-semibold tracking-tight text-ink">
            Intenção de contato
          </h2>
          <p className="mt-0.5 font-sans text-[12.5px] text-ink-3">
            Cliques nos botões da vitrine que redirecionam para o canal externo · últimos 30
            dias
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 font-sans text-[12px] text-ink-2">
          <span className="font-serif text-[15px] font-semibold tabular-nums text-ink">
            {totalGeral.toLocaleString('pt-BR')}
          </span>
          <span className="text-ink-3">cliques totais</span>
        </div>
      </div>

      <div className="mb-4 grid gap-3.5 sm:grid-cols-3">
        {CHANNELS.map((ch) => (
          <ChannelKpi
            key={ch}
            channel={ch}
            total={totals[ch]}
            topStore={top[ch].nome}
            topValue={top[ch].v}
          />
        ))}
      </div>

      <Card className="p-5 sm:p-6">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
          <span className="font-sans text-[13px] font-semibold text-ink">
            Por loja — total e mix de canais
          </span>
          <div className="flex gap-4">
            {CHANNELS.map((ch) => (
              <div key={ch} className="flex items-center gap-1.5">
                <span
                  className="block h-2.5 w-2.5 rounded-sm"
                  style={{ background: CH_COLOR[ch] }}
                />
                <span className="font-sans text-[11.5px] text-ink-2">{CH_LABEL[ch]}</span>
              </div>
            ))}
          </div>
        </div>
        {ranked.length === 0 ? (
          <p className="py-6 text-center font-sans text-sm text-ink-3">
            Nenhum clique de contato registrado ainda.
          </p>
        ) : (
          <div>
            {ranked.map((r) => (
              <ContactBarRow
                key={r.loja.id}
                nome={r.loja.nome}
                contatos={r.loja.contatos}
                total={r.total}
                maxTotal={maxTotal}
              />
            ))}
          </div>
        )}
      </Card>
    </section>
  )
}

function ChannelKpi({
  channel,
  total,
  topStore,
  topValue,
}: {
  channel: Channel
  total: number
  topStore: string | null
  topValue: number
}) {
  return (
    <Card className="p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-white"
            style={{ background: CH_COLOR[channel] }}
          >
            <ChannelIcon channel={channel} />
          </span>
          <span className="font-sans text-[13px] font-medium text-ink-2">
            {CH_LABEL[channel]}
          </span>
        </div>
        <span className="font-sans text-[11px] text-ink-3">30 dias</span>
      </div>
      <div className="font-serif text-[32px] font-semibold leading-none tracking-tight tabular-nums text-ink">
        {total.toLocaleString('pt-BR')}
      </div>
      <div className="mb-3 mt-1 font-sans text-[11.5px] text-ink-3">cliques de contato</div>
      {topStore && topValue > 0 ? (
        <div className="flex items-center gap-2 rounded-md bg-surface-2 px-2.5 py-2">
          <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3">
            Top
          </span>
          <span className="min-w-0 flex-1 truncate font-sans text-[12px] font-semibold text-ink">
            {topStore}
          </span>
          <span className="font-sans text-[11.5px] tabular-nums text-ink-2">{topValue}</span>
        </div>
      ) : null}
    </Card>
  )
}

function ContactBarRow({
  nome,
  contatos,
  total,
  maxTotal,
}: {
  nome: string
  contatos: ContactClickStats
  total: number
  maxTotal: number
}) {
  const pct = maxTotal ? total / maxTotal : 0
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-3 py-2.5 sm:grid-cols-[180px_1fr_190px]">
      <div className="flex min-w-0 items-center gap-2.5">
        <Initials name={nome} />
        <span className="truncate font-sans text-[12.5px] font-medium text-ink">{nome}</span>
      </div>
      <div className="relative h-5 overflow-hidden rounded bg-surface-2">
        <div
          className="flex h-full"
          style={{ width: `${Math.max(pct * 100, total > 0 ? 2 : 0)}%` }}
        >
          {CHANNELS.map((ch) => {
            const v = contatos[ch] ?? 0
            if (v === 0) return null
            const w = total ? (v / total) * 100 : 0
            return (
              <div
                key={ch}
                title={`${CH_LABEL[ch]}: ${v}`}
                style={{ width: `${w}%`, background: CH_COLOR[ch] }}
              />
            )
          })}
        </div>
      </div>
      <div className="col-span-2 flex items-center justify-end gap-3.5 font-sans text-[11.5px] tabular-nums text-ink-3 sm:col-span-1">
        <span title="Instagram">IG {contatos.instagram}</span>
        <span title="TikTok">TT {contatos.tiktok}</span>
        <span title="WhatsApp">WA {contatos.whatsapp}</span>
        <span className="min-w-[30px] text-right font-serif text-[15px] font-semibold text-ink">
          {total}
        </span>
      </div>
    </div>
  )
}

function Initials({ name }: { name: string }) {
  const i =
    name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase() || '·'
  return (
    <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-surface-2 font-sans text-[10px] font-semibold text-ink-2">
      {i}
    </span>
  )
}

function ChannelIcon({ channel }: { channel: Channel }) {
  if (channel === 'instagram') {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (channel === 'tiktok') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.78 1.52v-3.4a4.85 4.85 0 01-1.01-.12z" />
      </svg>
    )
  }
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}
