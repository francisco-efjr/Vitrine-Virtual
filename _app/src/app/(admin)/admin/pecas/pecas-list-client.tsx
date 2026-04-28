'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { PecaFormModal } from './peca-form-modal'
import { formatPreco } from '@/lib/validators/peca'
import type { PecaRow } from '@/types/database'

type PecaListItem = PecaRow & { foto_principal_url: string | null }

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
  const [modalOpen, setModalOpen] = useState(false)
  const [editPeca, setEditPeca] = useState<PecaListItem | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = initialPecas.filter((p) => p.nome.toLowerCase().includes(search.toLowerCase()))

  async function handleMarkSold(id: string) {
    await fetch(`/api/pecas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'marcar_vendida' }),
    })
    startTransition(() => router.refresh())
  }
  async function handleDelete(id: string) {
    await fetch(`/api/pecas/${id}`, { method: 'DELETE' })
    setDeleteId(null)
    startTransition(() => router.refresh())
  }

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

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            type="text"
            placeholder="Buscar peça..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-[9px] pl-9 text-sm text-ink outline-none focus:border-accent"
          />
        </div>
        <div className="flex overflow-hidden rounded-lg border border-border">
          {(['grid', 'list'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`px-3.5 py-2 text-sm font-medium ${
                view === v ? 'bg-ink text-white' : 'bg-surface text-ink-2'
              }`}
            >
              {v === 'grid' ? <LayoutGrid size={14} /> : <List size={14} />}
            </button>
          ))}
        </div>
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {filtered.map((p) => (
            <Card key={p.id} hoverable className="flex h-full flex-col overflow-hidden">
              <div className="aspect-square w-full bg-[#f0ebe3]" aria-hidden="true">
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
                  <span className="text-sm font-medium leading-snug">{p.nome}</span>
                  <Badge
                    label={p.status === 'disponivel' ? 'disponível' : 'vendida'}
                    variant={p.status}
                  />
                </div>
                <div className="min-h-[36px]">
                  {p.tamanho ? <div className="mb-1 text-xs text-ink-3">{p.tamanho}</div> : null}
                  <div className="font-serif text-lg font-semibold">
                    {formatPreco(p.preco_centavos) || <span className="text-sm text-ink-3">Consulte</span>}
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
                  {p.status === 'disponivel' && (
                    <Button variant="success" size="sm" onClick={() => handleMarkSold(p.id)}>
                      Vendida
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
        </div>
      ) : (
          <Card>
          {filtered.map((p, i) => (
            <div
              key={p.id}
              className={`flex flex-wrap items-center gap-4 px-4 py-3.5 sm:px-5 ${
                i < filtered.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#f0ebe3]" aria-hidden="true">
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
                <div className="mt-0.5 text-xs text-ink-3">{p.tamanho ?? '—'}</div>
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
                {p.status === 'disponivel' && (
                  <Button variant="success" size="sm" onClick={() => handleMarkSold(p.id)}>
                    Vendida ✓
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
