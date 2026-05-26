'use client'

import { useState } from 'react'
import { TryOnModal } from './try-on-modal'
import { IconHanger } from '@/components/brand/icon-hanger'

/**
 * Botão "Experimentar" — entry-point para a Cabine Virtual.
 * Visual alinhado ao handoff v3: pill escuro com ícone de cabide em accent.
 */
export function TryOnButton({
  pecaId,
  pecaNome,
  pecaTamanho = null,
  pecaPrecoCentavos = null,
  exibirPreco = false,
  whatsappE164,
  garmentImageUrl = null,
  garmentThumbUrl = null,
  cabineBackdropUrl = null,
  size = 'lg',
  fullWidth = false,
}: {
  pecaId: string
  pecaNome: string
  pecaTamanho?: string | null
  pecaPrecoCentavos?: number | null
  exibirPreco?: boolean
  whatsappE164: string | null
  garmentImageUrl?: string | null
  garmentThumbUrl?: string | null
  /**
   * Imagem de fundo personalizada da Cabine (configurada pela lojista).
   * Aparece como pano de fundo sutil durante a tela de loading.
   */
  cabineBackdropUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  /**
   * P1-05 (v6): permite o botão preencher a largura do container.
   * Usado pelo sticky bottom CTA da product detail page (mobile).
   */
  fullWidth?: boolean
}) {
  const [open, setOpen] = useState(false)

  const sizing =
    size === 'lg'
      ? 'px-5 py-3 text-sm'
      : size === 'sm'
        ? 'px-3.5 py-2 text-xs'
        : 'px-4 py-2.5 text-[13px]'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${
          fullWidth ? 'flex w-full' : 'inline-flex'
        } items-center justify-center gap-2 rounded-full bg-ink font-medium text-white shadow-sm transition duration-200 ease-[cubic-bezier(0.22,0.61,0.36,1)] hover:bg-[#2d2825] active:scale-[0.98] ${sizing}`}
      >
        <span className="text-accent" aria-hidden="true">
          <IconHanger size={size === 'lg' ? 15 : 13} strokeWidth={1.8} />
        </span>
        Experimentar
      </button>

      <TryOnModal
        open={open}
        onClose={() => setOpen(false)}
        pecaId={pecaId}
        pecaNome={pecaNome}
        pecaTamanho={pecaTamanho}
        pecaPrecoCentavos={pecaPrecoCentavos}
        exibirPreco={exibirPreco}
        whatsappE164={whatsappE164}
        garmentImageUrl={garmentImageUrl}
        garmentThumbUrl={garmentThumbUrl}
        cabineBackdropUrl={cabineBackdropUrl}
      />
    </>
  )
}
