import { cn } from '@/lib/utils'

export function Spinner({
  size = 20,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn('animate-spin', className)}
      style={{ animationDuration: '0.8s' }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray="31 31"
        strokeLinecap="round"
      />
    </svg>
  )
}
