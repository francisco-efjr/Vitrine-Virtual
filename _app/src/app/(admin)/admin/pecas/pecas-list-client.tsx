'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, LayoutGrid, List, Plus, RotateCcw, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Stagger } from '@/components/motion'
import { CATEGORIAS, getCategoriaLabel } from '@/lib/categorias'
import { PecaFormModal } from './peca-form-modal'
import { formatPreco } from '@/lib/validators/peca'
import { formatSizes, parseSizes, sortSizes } from '@/lib/sizes'
import type { PecaRow } from '@/types/database'

type PecaListItem = PecaRow & { foto_principal_url: string | null }

const TODAS_CAT = '__todas__'

function parseTamanhos(tamanho: string | null): string[] {
  return sortSizes(parseSizes(tamanho))
}

export function PecasListClient({
  initialPecas,
  title,
  showAll,
  children,
}: {
  initialPecas: PecaListItem[]
  title: string
  showAll: boolean
  children?: React.ReactNode
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [catF, setCatF] = useState<string>(TODAS_CAT)
  const [modalOpen, setModalOpen] = useState(false)
  const [editPeca, setEditPeca] = useState<PecaListItem | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [confirmSale, setConfirmSale] = useState<PecaListItem | null>(null)
  const [vendidoSizes, setVendidoSizes] = useState<string[]>([])
  const [acting, setActing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Categorias presentes na lista
  const catsDisponiveis = useMemo(() => {
    const set = new Set<string>()
    for (const p of initialPecas) if (p.categoria_id) set.add(p.categoria_id)
    return [
      ...CATEGORIAS.filter((c) => set.has(c.id)).map((c) => ({ id: c.id, label: c.label })),
      ...Array.from(set)
        .filter((id) => !CATEGORIAS.some((c) => c.id === id))
        .map((id) => ({ id, label: getCategoriaLabel(id) })),
    ]
  }, [initialPecas])

  // Categorias personalizadas (não pré-definidas) para reutilização no modal
  const categoriasExtra = useMemo(
    () => catsDisponiveis.filter((c) => !CATEGORIAS.some((cat) => cat.id === c.id)).map((c) => c.id),
    [catsDisponiveis],
  )

  // Ordenação fixa: mais antigas primeiro (regra do handoff v3)
  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return initialPecas
      .filter((p) => {
        const matchTerm =
          p.nome.toLowerCase().includes(term) ||
          getCategoriaLabel(p.categoria_id).toLowerCase().includes(term)
        const matchCat = catF === TODAS_CAT || p.categoria_id === catF
        return matchTerm && matchCat
      })
      .slice()
      .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
  }, [initialPecas, search, catF])

  function openSale(peca: PecaListItem) {
    setVendidoSizes([])
    setActionError(null)
    setConfirmSale(peca)
  }

  async function handleConfirmSale(scope: 'all' | 'selected') {
    if (!confirmSale) return
    setActing(true)
    setActionError(null)
    try {
      const tamanhos = parseTamanhos(confirmSale.tamanho)
      const isMulti = tamanhos.length > 1
      let res: Response
      if (!isMulti || scope === 'all' || vendidoSizes.length === tamanhos.length) {
        res = await fetch(`/api/pecas/${confirmSale.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'marcar_vendida' }),
        })
      } else {
        const restantes = tamanhos.filter((t) => !vendidoSizes.includes(t))
        res = await fetch(`/api/pecas/${confirmSale.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tamanho: restantes.join(', ') }),
        })
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setActionError(data?.error?.message ?? 'Não foi possível registrar a venda.')
        return
      }
      setConfirmSale(null)
      setVendidoSizes([])
      startTransition(() => router.refresh())
    } finally {
      setActing(false)
    }
  }

  async function handleRestore(id: string) {
    setActing(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/pecas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reabrir' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setActionError(data?.error?.message ?? 'Não foi possível restaurar a peça.')
        return
      }
      startTransition(() => router.refresh())
    } finally {
      setActing(false)
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/pecas/${id}`, { method: 'DELETE' })
    setDeleteId(null)
    startTransition(() => router.refresh())
  }

  const tamanhosVenda = parseTamanhos(confirmSale?.tamanho ?? null)
  const isMultiSize = tamanhosVenda.length > 1

  return (
    <div className="p-4 sm:p-6 lg:p-9">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-[24px] font-semibold tracking-tight text-ink sm:text-[26px]">
            {title}
          </h1>
          <p className="mt-1 font-sans text-[13px] text-ink-3">
            {filtered.length} {filtered.length === 1 ? 'peça' : 'peças'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {children}
          <Button
            variant="dark"
            icon={<Plus size={15} />}
            onClick={() => {
              setEditPeca(null)
              setModalOpen(true)
            }}
          >
            Nova peça
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative max-w-sm flex-1 min-w-[180px]">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <input
            type="text"
            placeholder="Buscar por nome ou categoria"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 pl-9 font-sans text-[13.5px] text-ink outline-none transition focus:border-accent"
          />
        </div>

        {/* Filtro de categorias — só aparece se há categorias */}
        {catsDisponiveis.length > 0 ? (
          <div className="-mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] sm:flex-initial">
            <CategoriaChip
              label="Todas"
              active={catF === TODAS_CAT}
              onClick={() => setCatF(TODAS_CAT)}
            />
            {catsDisponiveis.map((c) => (
              <CategoriaChip
                key={c.id}
                label={c.label}
                active={catF === c.id}
                onClick={() => setCatF(c.id)}
              />
            ))}
          </div>
        ) : null}

        <div className="ml-auto flex overflow-hidden rounded-lg border border-border">
          {(['grid', 'list'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`flex h-9 w-10 items-center justify-center transition ${
                view === v ? 'bg-ink text-white' : 'bg-surface text-ink-2'
              }`}
            >
              {v === 'grid' ? <LayoutGrid size={14} /> : <List size={14} />}
            </button>
          ))}
        </div>
      </div>

      {actionError ? (
        <p className="mb-4 rounded-lg bg-danger-light px-3 py-2 font-sans text-sm text-danger">
          {actionError}
        </p>
      ) : null}

      {view === 'grid' ? (
        <Stagger
          key={`grid-${catF}-${search}`}
          className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3.5"
          step={50}
        >
          {filtered.map((p) => (
            <Card key={p.id} hoverable className="flex h-full flex-col overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setEditPeca(p)
                  setModalOpen(true)
                }}
                className="block w-full text-left"
                aria-label={`Editar ${p.nome}`}
              >
                <div className="aspect-[3/4] w-full overflow-hidden bg-[#f0ebe3]">
                  {p.foto_principal_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.foto_principal_url}
                      alt={p.nome}
                      className="h-full w-full object-cover object-center transition-transform duration-500 hover:scale-[1.03]"
                    />
                  ) : null}
                </div>
              </button>
              <div className="flex flex-1 flex-col p-3.5">
                <div className="mb-1 flex items-start justify-between gap-1.5">
                  <span className="line-clamp-2 font-sans text-[13px] font-medium leading-snug text-ink">
                    {p.nome}
                  </span>
                  <Badge
                    label={p.status === 'disponivel' ? 'disponível' : 'vendida'}
                    variant={p.status}
                  />
                </div>
                <div className="mt-1 min-h-[34px]">
                  <SizesRow sizes={p.tamanho} />
                </div>
                <div className="font-serif text-[17px] font-semibold text-ink">
                  {formatPreco(p.preco_centavos) || (
                    <span className="font-sans text-[13px] text-ink-3">Consulte</span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditPeca(p)
                      setModalOpen(true)
                    }}
                  >
                    Editar
                  </Button>
                  {p.status === 'disponivel' ? (
                    <button
                      type="button"
                      onClick={() => openSale(p)}
                      disabled={acting}
                      title="Marcar como vendida"
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-border bg-surface text-ink-2 transition hover:border-accent hover:text-accent disabled:opacity-50"
                    >
                      <Check size={13} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRestore(p.id)}
                      disabled={acting}
                      className="inline-flex items-center gap-1 px-1.5 font-sans text-[12px] font-medium text-accent transition hover:text-accent-dark disabled:opacity-50"
                    >
                      <RotateCcw size={12} />
                      Restaurar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeleteId(p.id)}
                    title="Excluir"
                    className="ml-auto flex h-[30px] w-[30px] items-center justify-center rounded-md text-ink-3 transition hover:text-danger"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
          {filtered.length === 0 ? (
            <Card className="col-span-full p-10 text-center">
              <p className="font-sans text-sm text-ink-2">
                Nenhuma peça {showAll ? 'cadastrada' : 'disponível'} ainda.
              </p>
            </Card>
          ) : null}
        </Stagger>
      ) : (
        <Card>
          {filtered.map((p, i) => (
            <div key={p.id}>
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-5">
                <div className="h-[68px] w-[51px] shrink-0 overflow-hidden rounded-md bg-[#f0ebe3]">
                  {p.foto_principal_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.foto_principal_url}
                      alt={p.nome}
                      className="h-full w-full object-cover object-center"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-sans text-[13.5px] font-medium text-ink">
                    {p.nome}
                  </div>
                  <div className="mt-0.5 font-sans text-[11.5px] text-ink-3">
                    {[getCategoriaLabel(p.categoria_id), formatSizes(p.tamanho, ' · ')].filter(Boolean).join(' · ') ||
                      '—'}
                  </div>
                </div>
                <div className="font-serif text-[15px] font-semibold text-ink sm:ml-auto">
                  {formatPreco(p.preco_centavos) || '—'}
                </div>
                <Badge
                  label={p.status === 'disponivel' ? 'disponível' : 'vendida'}
                  variant={p.status}
                />
                <div className="flex gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditPeca(p)
                      setModalOpen(true)
                    }}
                  >
                    Editar
                  </Button>
                  {p.status === 'disponivel' ? (
                    <button
                      type="button"
                      onClick={() => openSale(p)}
                      title="Marcar como vendida"
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-border bg-surface text-ink-2 transition hover:border-accent hover:text-accent"
                    >
                      <Check size={13} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRestore(p.id)}
                      disabled={acting}
                      className="inline-flex items-center gap-1 px-1.5 font-sans text-[12px] font-medium text-accent transition hover:text-accent-dark disabled:opacity-50"
                    >
                      <RotateCcw size={12} />
                      Restaurar
                    </button>
                  )}
                </div>
              </div>
              {i < filtered.length - 1 ? <div className="mx-4 h-px bg-border sm:mx-5" /> : null}
            </div>
          ))}
          {filtered.length === 0 ? (
            <div className="p-10 text-center font-sans text-sm text-ink-2">
              Nenhuma peça {showAll ? 'cadastrada' : 'disponível'} ainda.
            </div>
          ) : null}
        </Card>
      )}

      <PecaFormModal
        open={modalOpen}
        peca={editPeca}
        onClose={() => {
          setModalOpen(false)
          setEditPeca(null)
        }}
        onSaved={() => {
          setModalOpen(false)
          setEditPeca(null)
          startTransition(() => router.refresh())
        }}
        categoriasExtra={categoriasExtra}
      />

      <Modal
        open={!!confirmSale}
        onClose={() => {
          if (!acting) {
            setConfirmSale(null)
            setVendidoSizes([])
          }
        }}
        title="Confirma a venda?"
        width={420}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmSale(null)
                setVendidoSizes([])
              }}
              disabled={acting}
            >
              Cancelar
            </Button>
            <Button
              variant="dark"
              onClick={() => handleConfirmSale('selected')}
              disabled={acting || (isMultiSize && vendidoSizes.length === 0)}
            >
              {acting
                ? 'Marcando…'
                : isMultiSize && vendidoSizes.length === tamanhosVenda.length
                  ? 'Marcar todos'
                  : 'Confirmar venda'}
            </Button>
          </>
        }
      >
        {!isMultiSize ? (
          <p className="font-sans text-[13.5px] leading-relaxed text-ink-2">
            A peça <strong className="font-medium text-ink">{confirmSale?.nome ?? ''}</strong>{' '}
            será marcada como vendida e sairá da vitrine. Você pode restaurá-la a qualquer momento
            em &quot;Todas as peças&quot;.
          </p>
        ) : (
          <div>
            <p className="mb-3 font-sans text-[13.5px] leading-relaxed text-ink-2">
              Qual tamanho foi vendido?
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {tamanhosVenda.map((t) => {
                const on = vendidoSizes.includes(t)
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setVendidoSizes((prev) => (on ? prev.filter((x) => x !== t) : [...prev, t]))
                    }
                    className={`rounded-full border px-4 py-1.5 font-sans text-[13px] transition ${
                      on
                        ? 'border-accent bg-accent-light font-semibold text-accent-dark'
                        : 'border-border text-ink-2 hover:border-border-2'
                    }`}
                  >
                    {t}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => handleConfirmSale('all')}
              disabled={acting}
              className="w-full rounded-lg border border-dashed border-border px-3 py-2 font-sans text-[13px] text-ink-2 transition hover:border-danger hover:text-danger"
            >
              Marcar todos os tamanhos como vendidos
            </button>
          </div>
        )}
      </Modal>

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Excluir peça"
        width={400}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => deleteId && handleDelete(deleteId)}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="font-sans text-[13.5px] leading-relaxed text-ink-2">
          Esta ação é irreversível. A peça e todas as fotos serão removidas.
        </p>
      </Modal>
    </div>
  )
}

function SizesRow({ sizes }: { sizes: string | null }) {
  const sorted = sortSizes(parseSizes(sizes))
  if (sorted.length === 0) return <span className="font-sans text-[11.5px] text-ink-3">—</span>
  return (
    <div className="-mx-0.5 flex flex-wrap gap-1 overflow-x-auto [scrollbar-width:none]">
      {sorted.map((t) => (
        <span
          key={t}
          className="shrink-0 rounded border border-border px-1.5 py-0.5 font-sans text-[10.5px] text-ink-3"
        >
          {t}
        </span>
      ))}
    </div>
  )
}

function CategoriaChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 font-sans text-[12.5px] font-medium transition ${
        active
          ? 'border-ink bg-ink text-white'
          : 'border-border text-ink-2 hover:border-border-2'
      }`}
    >
      {label}
    </button>
  )
}
