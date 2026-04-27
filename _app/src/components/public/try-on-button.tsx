'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { TryOnModal } from './try-on-modal'

export function TryOnButton({
  pecaId,
  pecaNome,
  whatsappE164,
  garmentImageUrl,
  garmentThumbUrl,
}: {
  pecaId: string
  pecaNome: string
  whatsappE164: string | null
  /** URL assinada (5 min) usada pelo servidor IA para buscar a imagem da peça. */
  garmentImageUrl: string | null
  /** URL assinada (1h) para exibir thumbnail da peça no modal de preview. */
  garmentThumbUrl: string | null
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-