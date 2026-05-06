'use client'

import { useState } from 'react'
import { TryOnModal } from './try-on-modal'

export function TryOnButton({
  pecaId,
  pecaNome,
  whatsappE164,
  garmentImageUrl = null,
  garmentThumbUrl = null,
}: {
  pecaId: string
  pecaNome: string
  whatsappE164: string | null
  garmentImageUrl?: string | null
  garmentThumbUrl?: string | null
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-dark"
      >
        {/* Hanger icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a2 2 0 1 0 0 4" />
          <path d="M12 7v2" />
          <path d="M3 19h18l-9-9-9 9z" />
        </svg>
        Experimentar na Cabine
      </button>

      <TryOnModal
        open={open}
        onClose={() => setOpen(false)}
        pecaId={pecaId}
        pecaNome={pecaNome}
        whatsappE164={whatsappE164}
        garmentImageUrl={garmentImageUrl}
        garmentThumbUrl={garmentThumbUrl}
      />
    </>
  )
}
