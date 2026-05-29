import Link from 'next/link'
import { Download } from 'lucide-react'
import { requireLojista } from '@/server/auth/session'
import { listOwnPecas, PECAS_ADMIN_PAGE_SIZE } from '@/server/pecas/crud'
import { PecasListClient } from '../pecas/pecas-list-client'

export const dynamic = 'force-dynamic'

export default async function TodasPecasPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const session = await requireLojista()
  const page = Math.max(1, Number.parseInt(searchParams.page ?? '1', 10) || 1)
  const offset = (page - 1) * PECAS_ADMIN_PAGE_SIZE
  const pageResult = await listOwnPecas(session.loja.id, {
    somenteDisponiveis: false,
    offset,
    limit: PECAS_ADMIN_PAGE_SIZE,
  })
  return (
    <div>
      <PecasListClient
        initialPecas={pageResult.items}
        pageInfo={{
          total: pageResult.total,
          pageSize: pageResult.limit,
          currentPage: page,
        }}
        title="Todas as peças"
        showAll
      >
        <Link
          href="/api/pecas/export"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-[18px] py-[9px] text-sm font-medium text-ink transition hover:bg-surface-2"
        >
          <Download size={14} /> Exportar CSV
        </Link>
      </PecasListClient>
    </div>
  )
}
