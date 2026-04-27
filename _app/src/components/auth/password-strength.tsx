'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { checkPassword, PASSWORD_RULE_LABELS, type PasswordChecks } from '@/lib/auth/password-rules'

/**
 * Mostra checklist de força de senha em tempo real.
 * Usado em DefinirSenha (pós-convite e reset).
 */
export function PasswordStrength({
  password,
  confirmation,
}: {
  password: string
  confirmation: string
}) {
  if (password.length === 0) return null
  const checks = checkPassword(password, confirmation)
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
      {PASSWORD_RULE_LABELS.map(({ key, label }) => {
        const ok = checks[key as keyof PasswordChecks]
        return (
          <li key={key} className="flex items-center gap-1.5">
            <span
              className={cn(
                'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full',
                ok ? 'bg-success-light text-success' : 'bg-surface-2 text-ink-3',
              )}
              aria-hidden="true"
            >
              {ok ? <Check size={9} strokeWidth={3} /> : <span className="text-[9px]">·</span>}
            </span>
            <span className={cn('text-xs', ok ? 'text-success' : 'text-ink-3')}>{label}</span>
          </li>
        )
      })}
    </ul>
  )
}
