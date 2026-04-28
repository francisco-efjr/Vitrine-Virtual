'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
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
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-dark"
      >
        <Sparkles size={15} />
        Provar com IA
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
