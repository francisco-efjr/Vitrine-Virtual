'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react'

interface FotoItem {
  id: string
  url: string
}

/**
 * GaleriaFotos — carrossel simples para a vitrine pública.
 *
 * - Foto grande no topo (aspect 4:5, típico de moda)
 * - Thumbnails clicáveis embaixo (até 8)
 * - Navegação por setas (← →) e por clique no thumb
 * - Fallback visual quando não há fotos
 */
export function GaleriaFotos({
  fotos,
  pecaNome,
}: {
  fotos: FotoItem[]
  pecaNome: string
}) {
  const [activeIdx, setActiveIdx] = useState(0)

  if (fotos.length === 0) {
    return (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-modal bg-[#f0ebe3]">
        <ImageOff size={32} className="text-ink-3" />
        <span className="text-sm text-ink-3">Sem fotos disponíveis</span>
      </div>
    )
  }

  const active = fotos[activeIdx]
  if (!active) return null
  const hasMultiple = fotos.length > 1

  function prev() {
    setActiveIdx((i) => (i === 0 ? fotos.length - 1 : i - 1))
  }
  function next() {
    setActiveIdx((i) => (i === fotos.length - 1 ? 0 : i + 1))
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Foto principal */}
      <div className="relative aspect-square w-full overflow-hidden rounded-modal bg-[#f0ebe3]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={active.id}
          src={active.url}
          alt={`${pecaNome} — foto ${activeIdx + 1}`}
          className="h-full w-full object-cover object-center transition-opacity duration-200"
        />

        {/* Setas de navegação */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(20,16,14,0.5)] text-white backdrop-blur-sm transition hover:bg-[rgba(20,16,14,0.75)]"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Próxima foto"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(20,16,14,0.5)] text-white backdrop-blur-sm transition hover:bg-[rgba(20,16,14,0.75)]"
            >
              <ChevronRight size={18} />
            </button>

            {/* Indicador de posição */}
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1">
              {fotos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Ver foto ${i + 1}`}
                  onClick={() => setActiveIdx(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === activeIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails (mostrar apenas se > 1 foto) */}
      {hasMultiple && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {fotos.map((foto, i) => (
            <button
              key={foto.id}
              type="button"
              onClick={() => setActiveIdx(i)}
              aria-label={`Ver foto ${i + 1}`}
              className={`shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                i === activeIdx ? 'border-accent' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
              style={{ width: 64, height: 80 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={foto.url}
                alt=""
                className="h-full w-full object-cover object-center"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
