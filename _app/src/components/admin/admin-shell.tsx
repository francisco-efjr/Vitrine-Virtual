'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  List,
  ListChecks,
  LogOut,
  Menu,
  Settings,
  X,
} from 'lucide-react'
import { LojaMark, VVLogo } from '@/components/brand/vv-logo'

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/pecas', label: 'Disponíveis', icon: ListChecks },
  { href: '/admin/todas-pecas', label: 'Todas as peças', icon: List },
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings },
] as const

/**
 * Sidebar do painel da loja — colapsável (handoff v3).
 *   - Largura 216px expandido / 64px colapsado (estado em localStorage)
 *   - Topo: VVLogo (animada) + botão chevron
 *   - Card com LojaMark + nome da loja
 *   - Itens com bg accent-light quando ativos
 *   - Footer: avatar + nome do user + botão Sair
 *   - Mobile: drawer com backdrop escuro
 */
export function AdminShell({
  loja,
  user,
  children,
}: {
  loja: { nome: string; slug: string; logo_url: string | null } | null
  user?: { nome: string; email: string } | null
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('vv-admin-sidebar-collapsed')
      if (saved === '1') setCollapsed(true)
    } catch {
      /* noop */
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem('vv-admin-sidebar-collapsed', collapsed ? '1' : '0')
    } catch {
      /* noop */
    }
  }, [collapsed])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <div className="flex min-h-screen bg-bg">
      <div
        className={`fixed inset-0 z-40 bg-[rgba(20,16,14,0.45)] transition-opacity md:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-surface transition-[width,transform] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] md:sticky md:z-20 ${
          collapsed ? 'w-[64px]' : 'w-[216px]'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div
          className={`flex items-center ${
            collapsed ? 'flex-col gap-2 px-0 pb-3 pt-4' : 'justify-between px-4 pb-3 pt-5'
          }`}
        >
          {!collapsed ? <VVLogo size={20} /> : null}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            title={collapsed ? 'Expandir' : 'Recolher'}
            className="hidden h-7 w-7 items-center justify-center rounded-md border border-border text-ink-2 transition hover:border-accent hover:text-accent md:flex"
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
            className="rounded-md border border-border p-1.5 text-ink-3 transition hover:text-ink md:hidden"
          >
            <X size={14} />
          </button>
        </div>

        {loja ? (
          !collapsed ? (
            <div className="px-4 pb-3">
              <div
                className="flex items-center gap-2.5 rounded-[10px] bg-surface-2 p-2.5"
                title={loja.nome}
              >
                <LojaMark loja={loja} size={26} radius={7} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-sans text-[12.5px] font-semibold text-ink">
                    {loja.nome}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center px-0 pb-3">
              <LojaMark loja={loja} size={32} radius={8} />
            </div>
          )
        ) : null}

        <nav className={`flex-1 ${collapsed ? 'px-2' : 'px-2.5'}`}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname?.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? label : undefined}
                className={`mb-0.5 flex items-center gap-2.5 rounded-lg py-2.5 text-[13.5px] transition ${
                  active
                    ? 'bg-accent-light font-semibold text-accent-dark'
                    : 'text-ink-2 hover:bg-surface-2'
                } ${collapsed ? 'justify-center px-2' : 'px-3'}`}
              >
                <Icon size={15} />
                {!collapsed ? <span>{label}</span> : null}
              </Link>
            )
          })}
        </nav>

        <div
          className={`border-t border-border ${
            collapsed ? 'flex flex-col items-center gap-2.5 px-2 py-3' : 'p-4'
          }`}
        >
          {!collapsed ? (
            <>
              {user ? (
                <div className="mb-2.5 flex items-center gap-2.5">
                  <Avatar name={user.nome} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-sans text-[12.5px] font-medium text-ink">
                      {user.nome}
                    </div>
                    <div className="truncate font-sans text-[11px] text-ink-3">
                      {user.email}
                    </div>
                  </div>
                </div>
              ) : null}
              <form action="/api/auth/sign-out" method="post">
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-transparent py-1.5 font-sans text-[12.5px] text-ink-2 transition hover:bg-surface-2"
                >
                  <LogOut size={13} />
                  Sair
                </button>
              </form>
            </>
          ) : (
            <>
              {user ? <Avatar name={user.nome} size={30} /> : null}
              <form action="/api/auth/sign-out" method="post">
                <button
                  type="submit"
                  title="Sair"
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-border text-ink-2 transition hover:text-ink"
                >
                  <LogOut size={13} />
                </button>
              </form>
            </>
          )}
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setMobileOpen(true)}
            className="rounded-md border border-border p-2 text-ink-3"
          >
            <Menu size={16} />
          </button>
          <div className="flex items-center gap-2 truncate">
            {loja ? <LojaMark loja={loja} size={24} radius={7} /> : null}
            <span className="truncate font-serif text-[15px] font-medium text-ink">
              {loja?.nome ?? 'Painel'}
            </span>
          </div>
          <div className="w-9" aria-hidden="true" />
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

function Avatar({ name, size }: { name: string; size: number }) {
  const initials =
    name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase() || '·'
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-accent-light text-accent-dark"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        fontWeight: 600,
      }}
    >
      {initials}
    </div>
  )
}
