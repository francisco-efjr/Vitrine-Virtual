import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/admin/admin-shell'
import { getSession } from '@/server/auth/session'
import { buildLojaAssetPublicUrl } from '@/server/lojas/assets'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login?next=/admin')

  // P0-04 (v6): super-admin sem loja → /admin/super.
  //
  // Antes, super-admin que abrisse /admin caía no painel de lojista que
  // crashava porque não havia `session.loja`. A tela quebrada padrão do Next
  // ("Application error: a server-side exception has occurred") era confundida
  // com bug. A correção de origem é redirecionar antes de carregar qualquer
  // painel de lojista. O error.tsx do grupo trata o caso residual.
  //
  // ATENÇÃO: /admin/super está DENTRO do grupo (admin) — ou seja, este mesmo
  // layout envolve a página /admin/super. Sem checar o pathname atual o
  // redirect aponta pra rota onde já estamos, gerando ERR_TOO_MANY_REDIRECTS.
  // O pathname vem do header `x-vv-pathname` setado pelo middleware.
  const currentPath = headers().get('x-vv-pathname') ?? ''
  if (
    session.isSuperAdmin &&
    !session.loja &&
    !currentPath.startsWith('/admin/super')
  ) {
    redirect('/admin/super')
  }

  // Lojista ainda sem loja (caso raro pós-convite) → manda para definir senha / espera
  if (!session.loja && !session.isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-serif text-2xl font-semibold">Sua loja ainda está sendo criada</h1>
          <p className="text-sm text-ink-2">
            Aguarde a confirmação por e-mail ou contate o administrador.
          </p>
          <Link href="/login" className="text-sm text-accent">
            Sair
          </Link>
        </div>
      </div>
    )
  }

  const userNome =
    session.profile.nome_completo?.trim() ||
    session.user.email.split('@')[0]?.replace(/[._]/g, ' ') ||
    'Lojista'

  return (
    <AdminShell
      loja={
        session.loja
          ? {
              nome: session.loja.nome,
              slug: session.loja.slug,
              logo_url: buildLojaAssetPublicUrl(session.loja.logo_storage_path),
            }
          : null
      }
      user={{ nome: userNome, email: session.user.email }}
    >
      {children}
    </AdminShell>
  )
}
