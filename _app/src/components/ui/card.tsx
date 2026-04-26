import * as React from 'react'
import { cn } from '@/lib/utils'

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { hoverable?: boolean }
>(function Card({ className, hoverable, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-card border border-border bg-surface shadow-card transition',
        hoverable && 'hover:-translate-y-px hover:shadow-card-hover',
        className,
      )}
      {...props}
    />
  )
})
