'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { TryOnModal } from './try-on-modal'

/**
 * Botão "Experimentar" — entry-point para a Cabine Virtual.
 * Visual alinhado ao handoff v3: pill escuro com starlet ✦ em accent.
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
  vitrineHref = null,
  size = 'lg',
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
  vitrineHref?: string | null
  size?: 'sm' | 'md' | 'lg'
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const handleTryAnother = useCallback(() => {
    setOpen(false)
    if (vitrineHref) router.push(vitrineHref)
  }, [router, vitrineHref])

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
        className={`inline-flex items-center justify-center gap-2 rounded-full bg-ink font-medium text-white shadow-sm transition duration-200 ease-[cubic-bezier(0.22,0.61,0.36,1)] hover:bg-[#2d2825] active:scale-[0.98] ${sizing}`}
      >
        <span className="text-accent" aria-hidden="true">
          ✦
        </span>
        Experimentar
      </button>

      <TryOnModal
        open={open}
        onClose={() => setOpen(false)}
        onTryAnother={vitrineHref ? handleTryAnother : undefined}
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
