import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/admin/admin-shell'
import { getSession } from '@/server/auth/session'
import { buildLojaAssetPublicUrl } from '@/server/lojas/assets'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login?next=/admin')

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
    >
      {children}
    </AdminShell>
  )
}
