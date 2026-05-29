'use client'

import type { VitrineTheme } from '@/types/database'

/**
 * Seletor de tema visual da vitrine pública.
 *
 * O super-admin escolhe se a vitrine de uma loja recebe o look padrão da
 * Vitrine Virtual ou uma identidade dedicada (ex: CasaGabyHarb — verde-musgo
 * + dourado, feito sob medida pra @casagabyharb).
 *
 * Mostramos um rótulo amigável; o id slug-style ("CasaGabyHarb") é o que
 * vai pro banco e identifica o tema na hora de renderizar /v/{slug}.
 */
export function VitrineThemeToggle({
  value,
  onChange,
  size = 'md',
  disabled,
}: {
  value: VitrineTheme
  onChange: (v: VitrineTheme) => void
  size?: 'sm' | 'md'
  disabled?: boolean
}) {
  const opts: { id: VitrineTheme; label: string; dot: string }[] = [
    { id: 'default', label: 'Padrão', dot: 'bg-[#b8956a]' },
    { id: 'CasaGabyHarb', label: 'Casa Gaby Harb', dot: 'bg-[#1F3A2A]' },
  ]
  const sm = size === 'sm'
  return (
    <div
      role="radiogroup"
      aria-label="Tema da vitrine"
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
