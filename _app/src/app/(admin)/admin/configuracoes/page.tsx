import { requireLojista } from '@/server/auth/session'
import { buildLojaAssetPublicUrl } from '@/server/lojas/assets'
import { ConfigClient } from './config-client'

export const dynamic = 'force-dynamic'

export default async function ConfiguracoesPage() {
  const session = await requireLojista()
  return (
    <ConfigClient
      initialLoja={session.loja}
      initialLogoUrl={buildLojaAssetPublicUrl(session.loja.logo_storage_path)}
      initialFundoUrl={buildLojaAssetPublicUrl(
        session.loja.provador_fundo_storage_path,
      )}
    />
  )
}
