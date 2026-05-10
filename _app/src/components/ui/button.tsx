import * as React from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'dark' | 'ghost' | 'danger' | 'success' | 'text'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-dark',
  dark: 'bg-ink text-white hover:bg-[#2d2825]',
  ghost: 'bg-transparent text-ink border border-border hover:bg-surface-2',
  danger: 'bg-danger text-white hover:bg-[#b56b6b]',
  success: 'bg-success text-white hover:bg-[#5a8a67]',
  text: 'bg-transparent text-ink-2 hover:text-accent',
}

const sizes: Record<Size, string> = {
  sm: 'text-[13px] px-3 py-1.5',
  md: 'text-sm px-[18px] py-[9px]',
  lg: 'text-base px-6 py-[13px]',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', icon, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition duration-150 ease-[cubic-bezier(0.22,0.61,0.36,1)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {icon ? <span className="flex items-center">{icon}</span> : null}
      {children}
    </button>
  )
})
