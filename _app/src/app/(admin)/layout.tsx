import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LayoutDashboard, ListChecks, List, Settings, LogOut } from 'lucide-react'
import { VVLogo } from '@/components/brand/vv-logo'
import { getSession } from '@/server/auth/session'

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/pecas', label: 'Peças disponíveis', icon: ListChecks },
  { href: '/admin/todas-pecas', label: 'Todas as peças', icon: List },
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings },
]

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
    <div className="flex min-h-screen bg-bg">
      <aside className="flex w-[220px] shrink-0 flex-col border-r border-border bg-surface">
        <div className="px-5 py-6">
          <VVLogo size={24} />
          {session.loja ? (
            <div className="mt-5 cursor-pointer rounded-[10px] bg-surface-2 p-3">
              <div className="truncate text-[13px] font-semibold text-ink">{session.loja.nome}</div>
              <div className="mt-0.5 text-[11px] text-ink-3">vitrine.app/v/{session.loja.slug}</div>
            </div>
          ) : null}
        </div>
        <nav className="flex-1 px-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-ink-2 transition hover:bg-surface-2 aria-[current=page]:bg-accent-light aria-[current=page]:font-semibold aria-[current=page]:text-accent-dark"
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border px-5 py-4">
          <form action="/api/auth/sign-out" method="post">
            <button
              type="submit"
              className="flex items-center gap-2 text-sm text-ink-2 transition hover:text-ink"
            >
              <LogOut size={14} />
              Sair
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
