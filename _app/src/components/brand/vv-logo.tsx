import { cn } from '@/lib/utils'

/**
 * Marca animada da Vitrine Virtual.
 *
 * Conforme handoff v3 (notes/design-handoff-v3/project/Vitrine Virtual.html),
 * a marca virou duas curvas suaves desenhadas (animação de stroke) + ponto
 * de apoio embaixo, em substituição às letras "vv" tipográficas.
 */
export function VVLogo({
  size = 28,
  variant = 'dark',
  showWordmark = true,
  animated = true,
  className,
}: {
  size?: number
  variant?: 'dark' | 'light'
  showWordmark?: boolean
  animated?: boolean
  className?: string
}) {
  const tileFill = variant === 'dark' ? '#1e1a17' : '#ffffff'
  const strokeFill = variant === 'dark' ? '#ffffff' : '#1e1a17'
  const textColor = variant === 'dark' ? 'text-ink' : 'text-white'
  const uid = Math.random().toString(36).slice(2, 8)
  return (
    <span className={cn('inline-flex items-center gap-[9px]', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        aria-hidden="true"
        style={{ transition: 'transform 600ms var(--e-spring)' }}
      >
        <rect width="32" height="32" rx="9" fill={tileFill} />
        <path
          d="M8 10 Q11 23 16 23 Q21 23 24 10"
          stroke={strokeFill}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          style={
            animated
              ? {
                  strokeDasharray: 50,
                  strokeDashoffset: 50,
                  animation: `vv-draw 900ms var(--e-out) forwards`,
                }
              : undefined
          }
        />
        <circle
          cx="16"
          cy="23"
          r="1.4"
          fill={strokeFill}
          style={
            animated
              ? {
                  opacity: 0,
                  animation: `vv-fade-in 400ms var(--e-out) 700ms forwards`,
                }
              : undefined
          }
        />
      </svg>
      {showWordmark ? (
        <span
          className={cn('font-serif italic leading-none', textColor)}
          style={{
            fontSize: size * 0.78,
            fontWeight: 400,
            letterSpacing: '-0.01em',
          }}
        >
          vitrine
        </span>
      ) : null}
      {/* uid acts as a stable seed (no rerender flicker) */}
      <span hidden>{uid}</span>
    </span>
  )
}

/**
 * LojaMark — exibe a logo da loja quando disponível, ou um monograma com
 * as iniciais quando não. Usado em todos os contextos onde a identidade da
 * loja precisa estar visível (vitrine pública, painel da loja, super-admin).
 */
export function LojaMark({
  loja,
  size = 34,
  radius = 10,
  className,
}: {
  loja: { nome: string; logo_url?: string | null } | null | undefined
  size?: number
  radius?: number
  className?: string
}) {
  const nome = loja?.nome ?? ''
  const initials =
    nome
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase() || '·'

  if (loja?.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={loja.logo_url}
        alt={nome}
        className={cn('block shrink-0 object-cover', className)}
        style={{ width: size, height: size, borderRadius: radius, background: '#f5f0ea' }}
      />
    )
  }
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center font-serif text-white',
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: '#1e1a17',
        fontSize: size * 0.42,
        fontWeight: 500,
        letterSpacing: '-0.01em',
      }}
    >
      {initials}
    </div>
  )
}
