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
import { VVLogo } from '@/components/brand/vv-logo'

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/pecas', label: 'Peças disponíveis', icon: ListChecks },
  { href: '/admin/todas-pecas', label: 'Todas as peças', icon: List },
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings },
] as const

export function AdminShell({
  loja,
  children,
}: {
  loja: { nome: string; slug: string; logo_url: string | null } | null
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const saved = getLocalStorageValue('vv-admin-sidebar-collapsed')
    if (saved === '1') setCollapsed(true)
  }, [])

  useEffect(() => {
    setLocalStorageValue('vv-admin-sidebar-collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <div className="flex min-h-screen bg-bg">
      <div
        className={`fixed inset-0 z-40 bg-[rgba(20,16,14,0.45)] transition md:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-surface transition-all md:sticky md:z-20 ${
          collapsed ? 'w-[88px]' : 'w-[248px]'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="flex items-center justify-between px-4 py-5">
          <div className={collapsed ? 'mx-auto' : ''}>
            <VVLogo size={24} />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
              className="hidden rounded-lg border border-border p-2 text-ink-3 transition hover:text-ink md:inline-flex"
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
              className="rounded-lg border border-border p-2 text-ink-3 transition hover:text-ink md:hidden"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {loja ? (
          <div className="px-4 pb-5">
            <div
              className={`flex items-center gap-2 rounded-[10px] bg-surface-2 p-3 ${
                collapsed ? 'justify-center text-center' : ''
              }`}
              title={loja.nome}
            >
              {loja.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={loja.logo_url}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded-full border border-border object-cover"
                />
              ) : null}
              {!collapsed ? (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-ink">{loja.nome}</div>
                </div>
              ) : !loja.logo_url ? (
                <div className="truncate text-[13px] font-semibold text-ink">
                  {loja.nome.slice(0, 1).toUpperCase()}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <nav className="flex-1 px-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? label : undefined}
                className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active
                    ? 'bg-accent-light font-semibold text-accent-dark'
                    : 'text-ink-2 hover:bg-surface-2'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon size={16} />
                {!collapsed ? <span>{label}</span> : null}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border px-4 py-4">
          <form action="/api/auth/sign-out" method="post">
            <button
              type="submit"
              title={collapsed ? 'Sair' : undefined}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-2 transition hover:bg-surface-2 hover:text-ink ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <LogOut size={14} />
              {!collapsed ? <span>Sair</span> : null}
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              aria-label="Abrir menu"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-border p-2 text-ink-3"
            >
              <Menu size={16} />
            </button>
            <div className="truncate text-sm font-medium text-ink">{loja?.nome ?? 'Painel'}</div>
            <div className="w-9" aria-hidden="true" />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

function getLocalStorageValue(key: string): string | null {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function'
      ? window.localStorage.getItem(key)
      : null
  } catch {
    return null
  }
}

function setLocalStorageValue(key: string, value: string) {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage?.setItem === 'function') {
      window.localStorage.setItem(key, value)
    }
  } catch {
    // noop em ambientes sem localStorage
  }
}
