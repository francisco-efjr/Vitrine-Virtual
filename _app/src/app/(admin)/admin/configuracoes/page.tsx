import { requireLojista } from '@/server/auth/session'
import { ConfigClient } from './config-client'

export const dynamic = 'force-dynamic'

export default async function ConfiguracoesPage() {
  const session = await requireLojista()
  return <ConfigClient initialLoja={session.loja} />
}
