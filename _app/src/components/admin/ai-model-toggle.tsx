'use client'

import type { AiImageModel } from '@/types/database'

/**
 * Controle segmentado High / Medium para o modelo de imagem da Cabine.
 *
 * Os nomes técnicos dos modelos (gemini-*) NUNCA aparecem aqui — só "High"
 * e "Medium". O ponto colorido dá a dica visual de qualidade.
 */
export function AIModelToggle({
  value,
  onChange,
  size = 'md',
  disabled,
}: {
  value: AiImageModel
  onChange: (v: AiImageModel) => void
  size?: 'sm' | 'md'
  disabled?: boolean
}) {
  const opts: { id: AiImageModel; label: string; dot: string }[] = [
    { id: 'high', label: 'High', dot: 'bg-[#a4d6a0]' },
    { id: 'medium', label: 'Medium', dot: 'bg-[#e4c989]' },
  ]
  const sm = size === 'sm'
  return (
    <div
      role="radiogroup"
      aria-label="Modelo de imagem"
      className="inline-flex gap-0 rounded-lg border border-border bg-surface-2 p-0.5"
    >
      {opts.map((o) => {
        const on = value === o.id
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(o.id)}
            className={`inline-flex items-center gap-1.5 rounded-md font-sans transition disabled:cursor-not-allowed disabled:opacity-60 ${
              sm ? 'px-2.5 py-1 text-[11.5px]' : 'px-3 py-1.5 text-[12.5px]'
            } ${on ? 'bg-ink font-semibold text-white' : 'bg-transparent font-medium text-ink-2'}`}
          >
            <span
              className={`block h-1.5 w-1.5 rounded-full ${o.dot} ${on ? 'opacity-100' : 'opacity-50'}`}
            />
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
