import Link from 'next/link'
import { Download } from 'lucide-react'
import { requireLojista } from '@/server/auth/session'
import { listOwnPecas } from '@/server/pecas/crud'
import { PecasListClient } from '../pecas/pecas-list-client'

export const dynamic = 'force-dynamic'

export default async function TodasPecasPage() {
  const session = await requireLojista()
  const pecas = await listOwnPecas(session.loja.id, { somenteDisponiveis: false })
  return (
    <div>
      <PecasListClient initialPecas={pecas} title="Todas as peças" showAll>
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
