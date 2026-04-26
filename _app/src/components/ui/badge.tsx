import { cn } from '@/lib/utils'

type Variant = 'disponivel' | 'vendida' | 'admin' | 'neutral' | 'warning'

const variants: Record<Variant, { bg: string; text: string; dot: string }> = {
  disponivel: { bg: 'bg-success-light', text: 'text-success', dot: 'bg-success' },
  vendida: { bg: 'bg-danger-light', text: 'text-danger', dot: 'bg-danger' },
  admin: { bg: 'bg-accent-light', text: 'text-accent-dark', dot: 'bg-accent' },
  neutral: { bg: 'bg-surface-2', text: 'text-ink-2', dot: 'bg-ink-3' },
  warning: { bg: 'bg-warning-light', text: 'text-warning', dot: 'bg-warning' },
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
      {label}
    </span>
  )
}
