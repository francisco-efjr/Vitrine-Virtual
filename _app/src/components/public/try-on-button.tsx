'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { TryOnModal } from './try-on-modal'

export function TryOnButton({
  pecaId,
  pecaNome,
  whatsappE164,
}: {
  pecaId: string
  pecaNome: string
  whatsappE164: string | null
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded bg-accent-light px-3 py-1.5 text-xs font-semibold text-accent-dark transition hover:bg-accent hover:text-white"
      >
        <Sparkles size={12} />
        Provar
      </button>
      <TryOnModal
        open={open}
        onClose={() => setOpen(false)}
        pecaId={pecaId}
        pecaNome={pecaNome}
        whatsappE164={whatsappE164}
      />
    </>
  )
}
