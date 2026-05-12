import { cn } from '@/lib/utils'

/**
 * Marca da Vitrine Virtual — monograma "vv" itálico em serif.
 *
 * Conforme handoff v4 (notes/design-handoff-v4): a identidade voltou ao
 * monograma escuro com "vv" branco em serif itálico (Bodoni Moda 600).
 * É a mesma identidade que aparece no centro do disco de loading da
 * Cabine, e agora se repete em todo o sistema — sidebar admin, login,
 * banner da loja, topo da cabine etc.
 *
 * Default: variante "dark" (quadrado preto + vv branco) sem o wordmark.
 */
export function VVLogo({
  size = 28,
  variant = 'dark',
  showWordmark = false,
  className,
}: {
  size?: number
  variant?: 'dark' | 'light'
  showWordmark?: boolean
  className?: string
}) {
  const bg = variant === 'dark' ? '#1e1a17' : '#ffffff'
  const fg = variant === 'dark' ? '#ffffff' : '#1e1a17'
  const radius = Math.round(size * 0.235)
  const innerFontSize = Math.round(size * 0.62)
  return (
    <span className={cn('inline-flex items-center gap-[9px]', className)}>
      <span
        aria-hidden="true"
        className="inline-flex shrink-0 items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-rotate-[4deg]"
        style={{ width: size, height: size, background: bg, borderRadius: radius }}
      >
        <span
          className="font-serif italic leading-none"
          style={{
            color: fg,
            fontSize: innerFontSize,
            fontWeight: 600,
            letterSpacing: '0.02em',
            transform: 'translateY(-1px)',
          }}
        >
          vv
        </span>
      </span>
      {showWordmark ? (
        <span
          className="font-serif italic leading-none"
          style={{
            color: variant === 'dark' ? '#1e1a17' : '#ffffff',
            fontSize: size * 0.78,
            fontWeight: 400,
            letterSpacing: '-0.01em',
          }}
        >
          vitrine
        </span>
      ) : null}
    </span>
  )
}

/**
 * LojaMark — exibe a logo da loja quando disponível, senão um monograma com
 * as iniciais. Usado nos contextos onde a identidade da loja precisa
 * aparecer (vitrine pública, painel da loja, super-admin).
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
