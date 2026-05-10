'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, LayoutGrid, List, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Stagger } from '@/components/motion'
import { CATEGORIAS, getCategoriaLabel } from '@/lib/categorias'
import { PecaFormModal } from './peca-form-modal'
import { formatPreco } from '@/lib/validators/peca'
import type { PecaRow } from '@/types/database'

type PecaListItem = PecaRow & { foto_principal_url: string | null }

const TODAS_CAT = '__todas__'

function parseTamanhos(tamanho: string | null): string[] {
  if (!tamanho) return []
  return tamanho
    .split(/[,·\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
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
  // Confirmação de venda — sempre exigida (decisão UX do design)
  const [confirmSale, setConfirmSale] = useState<PecaListItem | null>(null)
  const [vendidoSizes, setVendidoSizes] = useState<string[]>([])
  const [acting, setActing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Categorias presentes nesta lista (atalho para o filtro de chips)
  const catsDisponiveis = useMemo(() => {
    const set = new Set<string>()
    for (const p of initialPecas) {
      if (p.categoria_id) set.add(p.categoria_id)
    }
    // Mantém a ordem das CATEGORIAS conhecidas + adiciona as customizadas
    const ordered = [
      ...CATEGORIAS.filter((c) => set.has(c.id)).map((c) => ({ id: c.id, label: c.label })),
      ...Array.from(set)
        .filter((id) => !CATEGORIAS.some((c) => c.id === id))
        .map((id) => ({ id, label: getCategoriaLabel(id) })),
    ]
    return ordered
  }, [initialPecas])

  const filtered = initialPecas.filter((p) => {
    const term = search.toLowerCase()
    const matchTerm =
      p.nome.toLowerCase().includes(term) ||
      getCategoriaLabel(p.categoria_id).toLowerCase().includes(term)
    const matchCat = catF === TODAS_CAT || p.categoria_id === catF
    return matchTerm && matchCat
  })

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
        // Tira a peça toda da vitrine
        res = await fetch(`/api/pecas/${confirmSale.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'marcar_vendida' }),
        })
      } else {
        // Vendeu só alguns tamanhos → atualiza o campo tamanho com os restantes.
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[26px] font-semibold text-ink">{title}</h1>
          <p className="mt-1 text-sm text-ink-2">
            {filtered.length} {filtered.length === 1 ? 'peça encontrada' : 'peças encontradas'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {children}
          <Button
            variant="dark"
            icon={<Plus size={16} />}
            onClick={() => {
              setEditPeca(null)
              setModalOpen(true)
            }}
          >
            Nova peça
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            type="text"
            placeholder="Buscar por nome ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-[9px] pl-9 text-sm text-ink outline-none transition focus:border-accent"
          />
        </div>
        <div className="flex overflow-hidden rounded-lg border border-border">
          {(['grid', 'list'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`px-3.5 py-2 text-sm font-medium transition ${
                view === v ? 'bg-ink text-white' : 'bg-surface text-ink-2'
              }`}
            >
              {v === 'grid' ? <LayoutGrid size={14} /> : <List size={14} />}
            </button>
          ))}
        </div>
      </div>

      {/* Filtro de categorias — só aparece se a loja tem alguma categoria cadastrada */}
      {catsDisponiveis.length > 0 ? (
        <div className="mb-6 flex flex-wrap items-center gap-1.5">
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

      {actionError ? (
        <p className="mb-4 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger">{actionError}</p>
      ) : null}

      {view === 'grid' ? (
        <Stagger
          key={`grid-${catF}-${search}`}
          className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4"
          step={50}
        >
          {filtered.map((p) => (
            <Card key={p.id} hoverable className="flex h-full flex-col overflow-hidden">
              <div className="aspect-[3/4] w-full bg-[#f0ebe3]" aria-hidden="true">
                {p.foto_principal_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.foto_principal_url}
                    alt={p.nome}
                    className="h-full w-full object-cover object-center"
                  />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="mb-1.5 flex items-start justify-between gap-1.5">
                  <span className="line-clamp-2 text-sm font-medium leading-snug">{p.nome}</span>
                  <Badge
                    label={p.status === 'disponivel' ? 'disponível' : 'vendida'}
                    variant={p.status}
                  />
                </div>
                <div className="min-h-[36px]">
                  <div className="text-xs text-ink-3">
                    {[getCategoriaLabel(p.categoria_id), p.tamanho].filter(Boolean).join(' · ') ||
                      '—'}
                  </div>
                  <div className="font-serif text-lg font-semibold">
                    {formatPreco(p.preco_centavos) || (
                      <span className="text-sm text-ink-3">Consulte</span>
                    )}
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
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
                    <Button variant="dark" size="sm" onClick={() => openSale(p)}>
                      Vendida
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<RotateCcw size={13} />}
                      onClick={() => handleRestore(p.id)}
                      disabled={acting}
                    >
                      Restaurar
                    </Button>
                  )}
                  <Button variant="text" size="sm" onClick={() => setDeleteId(p.id)} className="text-danger">
                    ✕
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <Card className="col-span-full p-10 text-center">
              <p className="text-sm text-ink-2">
                Nenhuma peça {showAll ? 'cadastrada' : 'disponível'} ainda.
              </p>
            </Card>
          )}
        </Stagger>
      ) : (
        <Card>
          {filtered.map((p, i) => (
            <div
              key={p.id}
              className={`flex flex-wrap items-center gap-4 px-4 py-3.5 sm:px-5 ${
                i < filtered.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="h-[68px] w-[51px] shrink-0 overflow-hidden rounded-lg bg-[#f0ebe3]" aria-hidden="true">
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
                <div className="text-sm font-medium">{p.nome}</div>
                <div className="mt-0.5 text-xs text-ink-3">
                  {[getCategoriaLabel(p.categoria_id), p.tamanho].filter(Boolean).join(' · ') ||
                    '—'}
                </div>
              </div>
              <div className="font-serif text-base font-semibold sm:ml-auto">
                {formatPreco(p.preco_centavos) || '—'}
              </div>
              <Badge
                label={p.status === 'disponivel' ? 'disponível' : 'vendida'}
                variant={p.status}
              />
              <div className="flex gap-2">
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
                  <Button variant="dark" size="sm" onClick={() => openSale(p)}>
                    Vendida
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<RotateCcw size={13} />}
                    onClick={() => handleRestore(p.id)}
                    disabled={acting}
                  >
                    Restaurar
                  </Button>
                )}
              </div>
            </div>
          ))}
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
      />

      <Modal
        open={!!confirmSale}
        onClose={() => (acting ? null : (setConfirmSale(null), setVendidoSizes([])))}
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
                  ? 'Marcar todos como vendidos'
                  : 'Confirmar venda'}
            </Button>
          </>
        }
      >
        {!isMultiSize ? (
          <p className="text-sm leading-relaxed text-ink-2">
            A peça <strong className="font-semibold text-ink">{confirmSale?.nome ?? ''}</strong> será
            marcada como vendida e sairá da vitrine pública. Você pode restaurá-la a qualquer momento
            em &quot;Todas as peças&quot;.
          </p>
        ) : (
          <div>
            <p className="mb-3 text-sm leading-relaxed text-ink-2">Qual tamanho foi vendido?</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {tamanhosVenda.map((t) => {
                const on = vendidoSizes.includes(t)
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setVendidoSizes((prev) =>
                        on ? prev.filter((x) => x !== t) : [...prev, t],
                      )
                    }
                    className={`rounded-full border px-4 py-1.5 text-[13px] transition ${
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
              className="w-full rounded-lg border border-dashed border-border px-3 py-2 text-[13px] text-ink-2 transition hover:border-danger hover:text-danger"
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
        <p className="text-sm text-ink-2">
          Esta ação é irreversível. A peça e todas as suas fotos serão removidas da vitrine.
        </p>
      </Modal>
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
      className={`rounded-full border px-3 py-1 text-[12.5px] font-medium transition ${
        active
          ? 'border-ink bg-ink text-white'
          : 'border-border text-ink-2 hover:border-border-2'
      }`}
    >
      {label}
    </button>
  )
}
