import { requireLojista } from '@/server/auth/session'
import { listOwnPecas } from '@/server/pecas/crud'
import { PecasListClient } from './pecas-list-client'

export const dynamic = 'force-dynamic'

export default async function PecasPage() {
  const session = await requireLojista()
  const pecas = await listOwnPecas(session.loja.id, { somenteDisponiveis: true })
  return <PecasListClient initialPecas={pecas} title="Peças disponíveis" showAll={false} />
}
