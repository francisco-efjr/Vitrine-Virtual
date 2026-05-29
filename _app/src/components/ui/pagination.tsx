'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Paginação numérica simples — usada pelos painéis admin (peças, lojas).
 *
 * Modo URL: navega com `?page=N` preservando outros query params (busca,
 * filtros, etc). Mostra "Anterior · 1 2 … N · Próximo". A página atual
 * vem como prop pra ficar previsível em SSR.
 *
 * Quando `total <= pageSize`, não renderiza nada (sem páginas a navegar).
 */
export function Pagination({
  total,
  pageSize,
  currentPage,
  pageParam = 'page',
  className,
}: {
  total: number
  pageSize: number
  currentPage: number
  pageParam?: string
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  if (pageCount <= 1) return null

  function goTo(page: number) {
    const next = Math.max(1, Math.min(pageCount, page))
    const sp = new URLSearchParams(searchParams.toString())
    if (next === 1) sp.delete(pageParam)
    else sp.set(pageParam, String(next))
    const query = sp.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  // Janela de páginas: sempre mostra primeira, última, vizinhas da atual,
  // e "…" pra elidir o resto. Ex: 1 … 4 5 6 … 12
  const window: (number | 'ellipsis')[] = []
  const push = (v: number | 'ellipsis') => {
    if (window[window.length - 1] !== v) window.push(v)
  }
  push(1)
  for (let i = currentPage - 1; i <= currentPage + 1; i++) {
    if (i > 1 && i < pageCount) {
      if (i === currentPage - 1 && i > 2) push('ellipsis')
      push(i)
    }
  }
  if (currentPage + 2 < pageCount) push('ellipsis')
  if (pageCount > 1) push(pageCount)

  const startIdx = (currentPage - 1) * pageSize + 1
  const endIdx = Math.min(currentPage * pageSize, total)

  return (
    <nav
      aria-label="Paginação"
      className={`mt-6 flex flex-wrap items-center justify-between gap-3 ${className ?? ''}`}
    >
      <span className="font-sans text-[12px] text-ink-3">
        {startIdx}–{endIdx} de {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Página anterior"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-ink transition hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={14} />
        </button>
        {window.map((p, i) =>
          p === 'ellipsis' ? (
            <span
              key={`e${i}`}
              className="inline-flex h-8 w-6 items-center justify-center font-sans text-[12.5px] text-ink-3"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => goTo(p)}
              aria-current={p === currentPage ? 'page' : undefined}
              className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2.5 font-sans text-[12.5px] transition ${
                p === currentPage
                  ? 'bg-ink font-semibold text-white'
                  : 'border border-border bg-surface text-ink hover:border-ink'
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage >= pageCount}
          aria-label="Próxima página"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-ink transition hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </nav>
  )
}
