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
        'rounded-card border border-border bg-surface shadow-card transition duration-200 ease-[cubic-bezier(0.22,0.61,0.36,1)]',
        hoverable && 'hover:-translate-y-0.5 hover:shadow-card-hover',
        className,
      )}
      {...props}
    />
  )
})
