'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, LayoutGrid, Maximize2, X } from 'lucide-react'
import { Stagger } from '@/components/motion'
import { CATEGORIAS, getCategoriaLabel } from '@/lib/categorias'
import { formatPreco } from '@/lib/validators/peca'
import { TryOnModal } from './try-on-modal'

interface Peca {
  peca_id: string
  nome: string
  tamanho: string | null
  preco_centavos: number | null
  foto_principal_url?: string | null
  categoria_id?: string | null
  garmentImageUrl?: string | null
}

interface VitrineGridProps {
  slug: string
  pecas: Peca[]
  exibirPreco: boolean
  whatsappE164: string | null
  cabineBackdropUrl: string | null
}

type ViewMode = 'grade' | 'foco'

/**
 * Vitrine pública — grid + foco (peça única) + peca drawer + Cabine.
 *
 * Reproduz o handoff v3 (notes/design-handoff-v3/project/Vitrine Virtual.html):
 *   - Toggle Grade / Foco no canto superior direito
 *   - Filtro de categorias horizontais (chips)
 *   - Ao clicar em uma peça → abre o PecaDrawer (bottom sheet) com nome/tamanho/preço
 *     e botão "Experimentar" que entra na Cabine
 *   - Modo Foco: rail de thumbnails + imagem grande + painel lateral
 */
export function VitrineGrid({
  slug,
  pecas,
  exibirPreco,
  whatsappE164,
  cabineBackdropUrl,
}: VitrineGridProps) {
  const [catFilter, setCatFilter] = useState<string>('todas')
  const [viewMode, setViewMode] = useState<ViewMode>('grade')
  const [focusIdx, setFocusIdx] = useState(0)
  const [drawerPeca, setDrawerPeca] = useState<Peca | null>(null)
  const [cabinePeca, setCabinePeca] = useState<Peca | null>(null)
  const cabineDeepLinkDone = useRef(false)

  // Deep-link "Ver experiência do cliente" (Admin → ?cabine=1):
  // abre a Cabine da primeira peça disponível para o admin pré-visualizar
  // o fluxo do cliente. Só dispara uma vez e só com o parâmetro presente.
  useEffect(() => {
    if (cabineDeepLinkDone.current) return
    if (typeof window === 'undefined') return
    const wants = new URLSearchParams(window.location.search).get('cabine') === '1'
    if (!wants) return
    if (pecas.length === 0) return
    cabineDeepLinkDone.current = true
    setCabinePeca(pecas[0] ?? null)
  }, [pecas])

  // Categorias presentes na vitrine
  const availableCats = useMemo(() => {
    const ids = new Set<string>()
    for (const p of pecas) {
      if (p.categoria_id) ids.add(p.categoria_id)
    }
    return [
      { id: 'todas', label: 'Todas' },
      ...CATEGORIAS.filter((c) => ids.has(c.id)).map((c) => ({ id: c.id, label: c.label })),
      ...Array.from(ids)
        .filter((id) => !CATEGORIAS.some((c) => c.id === id))
        .map((id) => ({ id, label: getCategoriaLabel(id) })),
    ]
  }, [pecas])

  const filtered = useMemo(() => {
    if (catFilter === 'todas') return pecas
    return pecas.filter((p) => p.categoria_id === catFilter)
  }, [pecas, catFilter])

  useEffect(() => {
    setFocusIdx(0)
  }, [catFilter])

  const focusPeca = filtered[focusIdx] ?? null

  return (
    <div>
      {/* Controls: cat filter + view mode toggle */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none]">
          {availableCats.map((c) => {
            const on = catFilter === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCatFilter(c.id)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 font-sans text-[12.5px] font-medium transition ${
                  on
                    ? 'border-ink bg-ink text-white'
                    : 'border-border bg-transparent text-ink-2 hover:border-border-2'
                }`}
              >
                {c.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-xs text-ink-3">
            {filtered.length} {filtered.length === 1 ? 'peça' : 'peças'}
          </span>
          <div className="flex overflow-hidden rounded-lg border border-border">
            {[
              { id: 'grade' as const, Icon: LayoutGrid, label: 'Grade' },
              { id: 'foco' as const, Icon: Maximize2, label: 'Peça única' },
            ].map(({ id, Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setViewMode(id)}
                aria-label={label}
                title={label}
                className={`flex items-center justify-center px-2.5 py-1.5 transition ${
                  viewMode === id ? 'bg-ink text-white' : 'bg-surface text-ink-3'
                }`}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-12 text-center">
          <p className="font-sans text-sm text-ink-2">Nenhuma peça nessa categoria.</p>
        </div>
      ) : viewMode === 'grade' ? (
        <Stagger
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5"
          step={50}
          key={`grid-${catFilter}`}
        >
          {filtered.map((p) => (
            <button
              key={p.peca_id}
              type="button"
              onClick={() => setDrawerPeca(p)}
              className="vv-hover-lift group flex h-full flex-col overflow-hidden rounded-card bg-surface text-left shadow-card transition"
            >
              <div
                className="relative aspect-[3/4] w-full overflow-hidden bg-[#f0ebe3]"
                aria-hidden="true"
              >
                {p.foto_principal_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.foto_principal_url}
                    alt={p.nome}
                    className="h-full w-full object-cover object-center transition-transform duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:scale-[1.04]"
                  />
                ) : null}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-white/95 px-2.5 py-1 font-sans text-[10.5px] font-semibold text-ink backdrop-blur"
                >
                  ✦ Cabine
                </span>
              </div>
              <div className="flex flex-1 flex-col p-3 sm:p-4">
                <div className="truncate font-sans text-[13.5px] font-medium leading-snug text-ink">
                  {p.nome}
                </div>
                {p.tamanho ? (
                  <div className="mt-1 font-sans text-[11.5px] text-ink-3">{p.tamanho}</div>
                ) : null}
                <div className="mt-auto pt-3">
                  {exibirPreco && p.preco_centavos != null ? (
                    <span className="font-serif text-[15px] font-semibold text-ink sm:text-base">
                      {formatPreco(p.preco_centavos)}
                    </span>
                  ) : (
                    <span className="font-sans text-xs text-ink-3">Consulte o preço</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </Stagger>
      ) : (
        <FocoView
          pecas={filtered}
          focusIdx={focusIdx}
          setFocusIdx={setFocusIdx}
          exibirPreco={exibirPreco}
          onExperimentar={(p) => setDrawerPeca(p)}
          slug={slug}
        />
      )}

      <PecaDrawer
        peca={drawerPeca}
        open={!!drawerPeca}
        onClose={() => setDrawerPeca(null)}
        exibirPreco={exibirPreco}
        onCabine={(p) => {
          setDrawerPeca(null)
          setCabinePeca(p)
        }}
      />

      {cabinePeca ? (
        <TryOnModal
          open={!!cabinePeca}
          onClose={() => setCabinePeca(null)}
          onTryAnother={() => setCabinePeca(null)}
          pecaId={cabinePeca.peca_id}
          pecaNome={cabinePeca.nome}
          pecaTamanho={cabinePeca.tamanho}
          pecaPrecoCentavos={cabinePeca.preco_centavos}
          exibirPreco={exibirPreco}
          whatsappE164={whatsappE164}
          garmentImageUrl={cabinePeca.garmentImageUrl ?? null}
          garmentThumbUrl={cabinePeca.foto_principal_url ?? null}
          cabineBackdropUrl={cabineBackdropUrl}
        />
      ) : null}

      {/* Hidden helper to link tests/SEO crawlers to the deep page */}
      {focusPeca && viewMode === 'foco' ? (
        <Link
          href={`/v/${slug}/peca/${focusPeca.peca_id}`}
          className="sr-only"
          tabIndex={-1}
        >
          Abrir página da peça
        </Link>
      ) : null}
    </div>
  )
}

function FocoView({
  pecas,
  focusIdx,
  setFocusIdx,
  exibirPreco,
  onExperimentar,
  slug,
}: {
  pecas: Peca[]
  focusIdx: number
  setFocusIdx: (idx: number | ((prev: number) => number)) => void
  exibirPreco: boolean
  onExperimentar: (p: Peca) => void
  slug: string
}) {
  const peca = pecas[focusIdx]
  if (!peca) return null
  const hasPrev = focusIdx > 0
  const hasNext = focusIdx < pecas.length - 1
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:overflow-hidden md:rounded-card md:border md:border-border md:bg-surface">
      {/* Thumbnail rail — desktop apenas */}
      <div className="order-2 hidden w-[96px] shrink-0 flex-col gap-2 overflow-y-auto border-r border-border bg-surface p-2 md:order-1 md:flex">
        {pecas.map((p, i) => (
          <button
            key={p.peca_id}
            type="button"
            onClick={() => setFocusIdx(i)}
            className={`overflow-hidden rounded-md border-2 transition ${
              i === focusIdx ? 'border-accent' : 'border-border hover:border-border-2'
            }`}
          >
            <div className="aspect-[3/4] bg-[#f0ebe3]">
              {p.foto_principal_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.foto_principal_url}
                  alt={p.nome}
                  className="h-full w-full object-cover object-center"
                />
              ) : null}
            </div>
          </button>
        ))}
      </div>

      {/* Main image */}
      <div className="relative order-1 overflow-hidden rounded-card bg-[#f0ebe3] md:order-2 md:flex-1 md:rounded-none">
        <div className="aspect-[3/4] w-full md:aspect-auto md:h-[640px]">
          {peca.foto_principal_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={peca.peca_id}
              src={peca.foto_principal_url}
              alt={peca.nome}
              className="vv-fade-in h-full w-full object-cover object-center"
            />
          ) : null}
        </div>
        {hasPrev ? (
          <button
            type="button"
            onClick={() => setFocusIdx((i) => i - 1)}
            aria-label="Anterior"
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/92 text-ink shadow-md backdrop-blur transition hover:bg-white"
          >
            <ChevronLeft size={16} />
          </button>
        ) : null}
        {hasNext ? (
          <button
            type="button"
            onClick={() => setFocusIdx((i) => i + 1)}
            aria-label="Próxima"
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/92 text-ink shadow-md backdrop-blur transition hover:bg-white"
          >
            <ChevronRight size={16} />
          </button>
        ) : null}
        {/* Counter dots — mobile only */}
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 md:hidden">
          {pecas.slice(0, Math.min(pecas.length, 8)).map((_, i) => (
            <span
              key={i}
              className="block h-1 rounded-full transition-all"
              style={{
                width: i === focusIdx ? 16 : 5,
                background: i === focusIdx ? '#b8956a' : 'rgba(255,255,255,0.6)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Info panel */}
      <div className="order-3 flex shrink-0 flex-col gap-3.5 rounded-card border border-border bg-surface p-5 md:w-[260px] md:rounded-none md:border-y-0 md:border-r-0 md:border-l md:p-7">
        <div>
          <div className="font-serif text-[20px] font-semibold leading-snug tracking-tight text-ink">
            {peca.nome}
          </div>
          {peca.tamanho ? (
            <div className="mt-1 font-sans text-xs text-ink-3">{peca.tamanho}</div>
          ) : null}
        </div>
        {exibirPreco && peca.preco_centavos != null ? (
          <div className="font-serif text-[20px] font-semibold text-ink">
            {formatPreco(peca.preco_centavos)}
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => onExperimentar(peca)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 font-sans text-[13.5px] font-medium text-white transition hover:bg-[#2d2825]"
        >
          <span className="text-accent">✦</span>
          Experimentar
        </button>
        <Link
          href={`/v/${slug}/peca/${peca.peca_id}`}
          className="text-center font-sans text-xs text-ink-3 underline-offset-2 hover:underline"
        >
          Ver detalhes
        </Link>
        <div className="mt-auto pt-2 text-center font-sans text-xs text-ink-3">
          {focusIdx + 1} de {pecas.length}
        </div>
      </div>
    </div>
  )
}

function PecaDrawer({
  peca,
  open,
  onClose,
  exibirPreco,
  onCabine,
}: {
  peca: Peca | null
  open: boolean
  onClose: () => void
  exibirPreco: boolean
  onCabine: (p: Peca) => void
}) {
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', handler)
    }
  }, [open, onClose])

  if (!open || !peca) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[1500] flex items-end justify-center bg-[rgba(18,14,12,0.5)] backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[20px] bg-surface shadow-[0_-8px_48px_rgba(0,0,0,0.18)]"
        style={{ animation: 'vv-slide-up 0.32s var(--e-out-soft)' }}
      >
        <div className="flex justify-center pb-1 pt-2.5">
          <div className="h-1 w-10 rounded-full bg-border-2" />
        </div>
        <div className="overflow-y-auto">
          <div className="relative">
            <div className="aspect-[4/3] w-full overflow-hidden bg-[#f0ebe3]">
              {peca.foto_principal_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={peca.foto_principal_url}
                  alt={peca.nome}
                  className="h-full w-full object-cover object-center"
                />
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink backdrop-blur transition hover:bg-white"
            >
              <X size={15} />
            </button>
          </div>
          <div className="flex flex-col gap-4 p-5 pb-7 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="font-serif text-[22px] font-semibold leading-snug text-ink">
                  {peca.nome}
                </div>
                {peca.tamanho ? (
                  <div className="mt-1 font-sans text-[13px] text-ink-3">
                    Disponível nos tamanhos:{' '}
                    <strong className="font-medium text-ink-2">{peca.tamanho}</strong>
                  </div>
                ) : null}
              </div>
              {exibirPreco && peca.preco_centavos != null ? (
                <div className="font-serif text-[22px] font-semibold text-ink">
                  {formatPreco(peca.preco_centavos)}
                </div>
              ) : null}
            </div>
            <div
              className="flex items-center gap-3 rounded-2xl border border-accent-dark/15 p-4"
              style={{
                background: 'linear-gradient(135deg, #f2e8d8, #f8f0e4)',
              }}
            >
              <div className="flex-1">
                <div className="font-serif text-[15px] font-semibold text-accent-dark">
                  ✦ Cabine Virtual
                </div>
                <div className="mt-0.5 font-sans text-xs leading-relaxed text-accent-dark/80">
                  Experimente esta peça em você antes de comprar
                </div>
              </div>
              <button
                type="button"
                onClick={() => onCabine(peca)}
                className="rounded-lg bg-accent px-4 py-2.5 font-sans text-[13px] font-semibold text-white transition hover:bg-accent-dark"
              >
                Experimentar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
