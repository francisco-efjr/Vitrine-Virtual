'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, RefreshCcw } from 'lucide-react'
import { VVLogo } from '@/components/brand/vv-logo'

/**
 * P0-04 (v6): recovery screen para o grupo /admin.
 *
 * Antes, qualquer exceção do server (incluindo o crash do super-admin
 * acessando /admin/dashboard) caía na tela default do Next:
 *
 *   "Application error: a server-side exception has occurred. Digest: …"
 *
 * — terminal-style, sem identidade, sem saída. Era beco sem saída.
 *
 * Agora, mesma tela, mas com VVLogo, copy humanizado, dois caminhos de
 * recuperação (voltar para vitrine, tentar de novo) e um ref discreto pra
 * suporte. O log da exceção continua subindo (console.error → Sentry),
 * apenas a apresentação é gentil.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Em produção isto fluirá para Sentry/Logger automaticamente.
    // Mantemos console.error para visibilidade em dev e fallback de cliente.
    console.error('[admin] unhandled error:', error)
  }, [error])

  const now = new Date()
  const stamp = `${now.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })} · ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto flex min-h-screen max-w-[560px] flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-5 inline-flex">
          <VVLogo size={36} />
        </div>
        <div
          className="mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-surface-2"
          aria-hidden="true"
        >
          <AlertTriangle size={28} className="text-warning" />
        </div>
        <h1 className="font-serif text-[28px] font-semibold leading-snug tracking-tight text-ink sm:text-[30px]">
          Alguma coisa não saiu como deveria
        </h1>
        <p className="mt-2.5 max-w-[380px] font-sans text-[14px] leading-relaxed text-ink-2">
          Nosso lado deu um tropeço. Já avisamos o time. Você pode tentar de novo ou voltar pra
          sua vitrine.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 font-sans text-[13.5px] font-medium text-ink transition hover:border-ink"
          >
            <ArrowLeft size={14} />
            Voltar para a vitrine
          </Link>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-sans text-[13.5px] font-medium text-white transition hover:bg-[#2d2825]"
          >
            <RefreshCcw size={14} />
            Tentar novamente
          </button>
        </div>

        {error.digest ? (
          <div className="mt-6 font-mono text-[11px] tracking-wide text-ink-3">
            ref · {error.digest} · {stamp}
          </div>
        ) : (
          <div className="mt-6 font-mono text-[11px] tracking-wide text-ink-3">{stamp}</div>
        )}
      </div>
    </div>
  )
}
