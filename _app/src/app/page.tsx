import Link from 'next/link'
import { VVLogo } from '@/components/brand/vv-logo'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-surface px-8 py-4 flex items-center justify-between">
        <VVLogo />
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/login" className="text-ink-2 hover:text-ink transition">
            Entrar
          </Link>
        </nav>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-2xl text-center space-y-6">
          <h1 className="font-serif text-5xl font-semibold text-ink leading-tight">
            A vitrine online da sua loja, com provador virtual por IA.
          </h1>
          <p className="text-lg text-ink-2 max-w-xl mx-auto">
            Mostre suas peças, deixe seus clientes provarem virtualmente e converse direto no
            WhatsApp. Tudo em um link.
          </p>
          <p className="text-sm text-ink-3">
            Em fase fechada — entre em contato para criar a vitrine da sua loja.
          </p>
        </div>
      </main>
      <footer className="border-t border-border bg-surface px-8 py-4 flex items-center justify-between text-xs text-ink-3">
        <span>© Vitrine Virtual</span>
        <div className="flex gap-4">
          <Link href="/privacidade" className="hover:text-ink transition">
            Privacidade
          </Link>
          <Link href="/termos" className="hover:text-ink transition">
            Termos
          </Link>
        </div>
      </footer>
    </div>
  )
}
