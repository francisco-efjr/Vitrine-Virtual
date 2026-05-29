'use client'

/**
 * Casa Gaby Harb — grid editorial (3 colunas em desktop, 2 em mobile).
 *
 * Reaproveita o TryOnModal padrão da Vitrine Virtual — a estética da
 * Cabine continua sendo a do produto (ela é o motor de IA, transversal).
 * Aqui só envelopamos a grade com o look CGH.
 *
 * Paginação client-side: SSR vem com a 1ª página; "Carregar mais" pede
 * /api/v/{slug}/pecas?offset=N e acumula no state. Total vem do RPC pra
 * UI saber quando o botão some.
 */
import { useMemo, useState } from 'react'
import { CATEGORIAS, getCategoriaLabel } from '@/lib/categorias'
import { CGHPieceCard } from './piece-card'
import { CGHTryOnModal } from './try-on-modal'
import { CGH } from './tokens'
import { FF, Btn } from './atoms'

interface Peca {
  peca_id: string
  nome: string
  tamanho: string | null
  preco_centavos: number | null
  foto_principal_url?: string | null
  categoria_id?: string | null
}

export function CGHVitrineGrid({
  slug,
  pecas: initialPecas,
  totalPecas,
  exibirPreco,
  whatsappE164,
  cabineBackdropUrl,
}: {
  slug: string
  pecas: Peca[]
  totalPecas?: number
  exibirPreco: boolean
  whatsappE164: string | null
  cabineBackdropUrl: string | null
}) {
  const [pecas, setPecas] = useState<Peca[]>(initialPecas)
  const [cabinePeca, setCabinePeca] = useState<Peca | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreErr, setLoadMoreErr] = useState<string | null>(null)
  const [catFilter, setCatFilter] = useState<string>('todas')
  const total = totalPecas ?? pecas.length
  const hasMore = pecas.length < total

  // Chips de categoria — filtra in-memory sobre as peças carregadas.
  // Quando filtro está ativo, escondemos "Carregar mais" porque a próxima
  // página pode trazer peças de qualquer categoria; melhor seguir essa
  // estratégia até paginar server-side por categoria.
  const availableCats = useMemo(() => {
    const ids = new Set<string>()
    for (const p of pecas) {
      if (p.categoria_id) ids.add(p.categoria_id)
    }
    return [
      { id: 'todas', label: 'Tudo' },
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

  async function loadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    setLoadMoreErr(null)
    try {
      const r = await fetch(`/api/v/${slug}/pecas?offset=${pecas.length}`)
      const data = await r.json()
      if (!r.ok || !data?.ok) {
        throw new Error(data?.error?.message ?? `HTTP ${r.status}`)
      }
      setPecas((prev) => [...prev, ...(data.data.pecas ?? [])])
    } catch (e) {
      setLoadMoreErr(e instanceof Error ? e.message : 'Falha ao carregar mais peças')
    } finally {
      setLoadingMore(false)
    }
  }

  if (pecas.length === 0) {
    return (
      <div
        style={{
          padding: '64px 24px',
          textAlign: 'center',
          fontFamily: 'var(--font-cgh-serif), Georgia, serif',
          fontStyle: 'italic',
          fontSize: 19,
          color: 'rgba(31,58,42,0.6)',
        }}
      >
        A curadoria deste mês está sendo preparada.
      </div>
    )
  }

  return (
    <>
      {availableCats.length > 1 ? (
        <div
          style={{
            display: 'flex',
            gap: 9,
            marginBottom: 28,
            overflowX: 'auto',
            paddingBottom: 4,
            WebkitOverflowScrolling: 'touch',
          }}
          className="cgh-cat-chips"
        >
          {availableCats.map((c) => {
            const on = catFilter === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCatFilter(c.id)}
                style={{
                  flexShrink: 0,
                  padding: '8px 14px',
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                  fontFamily: FF.sans,
                  fontSize: 11.5,
                  fontWeight: 500,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  border: on
                    ? '1px solid transparent'
                    : '1px solid rgba(31,58,42,0.18)',
                  background: on ? CGH.musgo : 'transparent',
                  color: on ? CGH.cream : 'rgba(31,58,42,0.62)',
                  cursor: 'pointer',
                }}
              >
                {c.label}
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="cgh-grid">
        {filtered.map((p) => (
          <CGHPieceCard
            key={p.peca_id}
            peca={p}
            exibirPreco={exibirPreco}
            onClick={() => setCabinePeca(p)}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            padding: '40px 24px',
            textAlign: 'center',
            fontFamily: FF.serif,
            fontStyle: 'italic',
            fontSize: 18,
            color: 'rgba(31,58,42,0.55)',
          }}
        >
          Nenhuma peça nessa categoria por enquanto.
        </div>
      ) : null}

      {catFilter === 'todas' && hasMore ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            marginTop: 40,
          }}
        >
          <Btn
            variant="ghostLight"
            size="md"
            onClick={loadMore}
            style={loadingMore ? { opacity: 0.6, cursor: 'wait' } : undefined}
          >
            {loadingMore
              ? 'Carregando…'
              : `Ver mais da curadoria (${total - pecas.length})`}
          </Btn>
          {loadMoreErr ? (
            <span
              style={{
                fontFamily: FF.sans,
                fontSize: 11.5,
                color: CGH.borgonha,
              }}
            >
              {loadMoreErr}
            </span>
          ) : null}
        </div>
      ) : null}

      {cabinePeca ? (
        <CGHTryOnModal
          open={!!cabinePeca}
          onClose={() => setCabinePeca(null)}
          pecaId={cabinePeca.peca_id}
          pecaNome={cabinePeca.nome}
          pecaTamanho={cabinePeca.tamanho}
          pecaPrecoCentavos={cabinePeca.preco_centavos}
          exibirPreco={exibirPreco}
          whatsappE164={whatsappE164}
          garmentImageUrl={null}
          garmentThumbUrl={cabinePeca.foto_principal_url ?? null}
          cabineBackdropUrl={cabineBackdropUrl}
        />
      ) : null}
    </>
  )
}
