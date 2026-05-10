'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 520,
}: {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  width?: number
}) {
  // Bloqueia scroll body quando aberto
  React.useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    const prevPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    return () => {
      document.body.style.overflow = prev
      document.body.style.paddingRight = prevPaddingRight
    }
  }, [open])

  // ESC fecha
  React.useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="vv-fade-in fixed inset-0 z-50 flex items-end justify-center bg-[rgba(30,26,23,0.55)] p-0 backdrop-blur-[3px] sm:items-center sm:p-5"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: width }}
        className={cn(
          'vv-pop-spring flex max-h-[92vh] w-full flex-col rounded-t-[22px] bg-surface shadow-modal sm:rounded-modal',
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <span className="font-serif text-[22px] font-semibold text-ink">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded p-1 text-ink-3 transition hover:text-ink"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer ? (
          <div className="flex flex-wrap justify-end gap-2.5 border-t border-border px-4 py-4 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
