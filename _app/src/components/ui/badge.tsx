import { cn } from '@/lib/utils'

// Paleta boutique (Vivara/Farm) — disponível em ouro-taupe, vendida em cinza
// suave com line-through. Substitui verde/vermelho agressivo do design v1.
type Variant = 'disponivel' | 'vendida' | 'admin' | 'neutral' | 'warning' | 'success'

const variants: Record<Variant, { bg: string; text: string; dot: string; lineThrough?: boolean }> = {
  disponivel: { bg: 'bg-accent-light', text: 'text-accent-dark', dot: 'bg-accent' },
  vendida: { bg: 'bg-[#f0edea]', text: 'text-[#a09890]', dot: 'bg-[#c8c0b8]', lineThrough: true },
  admin: { bg: 'bg-accent-light', text: 'text-accent-dark', dot: 'bg-accent' },
  neutral: { bg: 'bg-surface-2', text: 'text-ink-2', dot: 'bg-ink-3' },
  warning: { bg: 'bg-warning-light', text: 'text-warning', dot: 'bg-warning' },
  success: { bg: 'bg-success-light', text: 'text-success', dot: 'bg-success' },
}

export function Badge({
  label,
  variant = 'neutral',
  className,
}: {
  label: React.ReactNode
  variant?: Variant
  className?: string
}) {
  const v = variants[variant]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-xs font-medium',
        v.bg,
        v.text,
        className,
      )}
    >
      <span className={cn('h-[5px] w-[5px] shrink-0 rounded-full', v.dot)} />
      <span className={v.lineThrough ? 'line-through decoration-[#c8c0b8]' : undefined}>
        {label}
      </span>
    </span>
  )
}
