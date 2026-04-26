import { cn } from '@/lib/utils'

export function VVLogo({
  size = 28,
  variant = 'dark',
  className,
}: {
  size?: number
  variant?: 'dark' | 'light'
  className?: string
}) {
  const tileFill = variant === 'dark' ? '#1e1a17' : '#ffffff'
  const letterFill = variant === 'dark' ? '#ffffff' : '#1e1a17'
  const textColor = variant === 'dark' ? 'text-ink' : 'text-white'
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill={tileFill} />
        <text
          x="16"
          y="22"
          fontFamily="Georgia, serif"
          fontSize="14"
          fontWeight={600}
          fill={letterFill}
          textAnchor="middle"
          letterSpacing="0.5"
        >
          vv
        </text>
      </svg>
      <span
        className={cn('font-serif font-semibold tracking-wider leading-none', textColor)}
        style={{ fontSize: size * 0.75 }}
      >
        vitrine
      </span>
    </span>
  )
}
