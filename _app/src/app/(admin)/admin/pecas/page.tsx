import { requireLojista } from '@/server/auth/session'
import { listOwnPecas, PECAS_ADMIN_PAGE_SIZE } from '@/server/pecas/crud'
import { PecasListClient } from './pecas-list-client'

export const dynamic = 'force-dynamic'

export default async function PecasPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const session = await requireLojista()
  const page = Math.max(1, Number.parseInt(searchParams.page ?? '1', 10) || 1)
  const offset = (page - 1) * PECAS_ADMIN_PAGE_SIZE
  const pageResult = await listOwnPecas(session.loja.id, {
    somenteDisponiveis: true,
    offset,
    limit: PECAS_ADMIN_PAGE_SIZE,
  })
  return (
    <PecasListClient
      initialPecas={pageResult.items}
      pageInfo={{
        total: pageResult.total,
        pageSize: pageResult.limit,
        currentPage: page,
      }}
      title="Peças disponíveis"
      showAll={false}
    />
  )
}
