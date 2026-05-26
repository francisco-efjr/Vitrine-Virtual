import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  helper?: string
  error?: string
  prefix?: React.ReactNode
  suffix?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helper, error, prefix, suffix, className, id, ...props },
  ref,
) {
  const reactId = React.useId()
  const inputId = id ?? reactId
  return (
    <div className="flex flex-col gap-[5px]">
      {label ? (
        <label htmlFor={inputId} className="text-[13px] font-medium text-ink-2">
          {label}
        </label>
      ) : null}
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-3">
            {prefix}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-lg border bg-surface px-3 py-[9px] text-sm text-ink outline-none transition',
            error ? 'border-danger' : 'border-border focus:border-accent',
            prefix ? 'pl-9' : '',
            suffix ? 'pr-9' : '',
            className,
          )}
          {...props}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-ink-3">
            {suffix}
          </span>
        ) : null}
      </div>
      {/* P0-03 (v6): helper passa de text-ink-3 (2.78:1) para text-ink-2 (5.8:1) para atender WCAG AA. */}
      {error || helper ? (
        <span className={cn('text-xs', error ? 'text-danger' : 'text-ink-2')}>
          {error || helper}
        </span>
      ) : null}
    </div>
  )
})

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; helper?: string; error?: string }
>(function Textarea({ label, helper, error, className, id, ...props }, ref) {
  const reactId = React.useId()
  const inputId = id ?? reactId
  return (
    <div className="flex flex-col gap-[5px]">
      {label ? (
        <label htmlFor={inputId} className="text-[13px] font-medium text-ink-2">
          {label}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={inputId}
        className={cn(
          'w-full resize-y rounded-lg border bg-surface px-3 py-[9px] text-sm text-ink outline-none transition',
          error ? 'border-danger' : 'border-border focus:border-accent',
          className,
        )}
        {...props}
      />
      {/* P0-03 (v6): helper passa de text-ink-3 (2.78:1) para text-ink-2 (5.8:1) para atender WCAG AA. */}
      {error || helper ? (
        <span className={cn('text-xs', error ? 'text-danger' : 'text-ink-2')}>
          {error || helper}
        </span>
      ) : null}
    </div>
  )
})
