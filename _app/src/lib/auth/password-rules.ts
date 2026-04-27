/**
 * Regras de força de senha — função pura, fácil de testar.
 *
 * Mínimo 8 caracteres, 1 maiúscula, 1 número.
 * Confirmação separada (senha === confirmar).
 *
 * Espelha o checklist do designer no protótipo.
 */

export const PASSWORD_MIN_LENGTH = 8

export interface PasswordChecks {
  hasMin: boolean
  hasUpper: boolean
  hasNum: boolean
  matches: boolean
  /** Todas as regras OK */
  valid: boolean
}

export function checkPassword(password: string, confirmation: string): PasswordChecks {
  const hasMin = password.length >= PASSWORD_MIN_LENGTH
  const hasUpper = /[A-Z]/.test(password)
  const hasNum = /[0-9]/.test(password)
  const matches = password.length > 0 && password === confirmation
  const valid = hasMin && hasUpper && hasNum && matches
  return { hasMin, hasUpper, hasNum, matches, valid }
}

export const PASSWORD_RULE_LABELS: Array<{ key: keyof Omit<PasswordChecks, 'valid'>; label: string }> = [
  { key: 'hasMin', label: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres` },
  { key: 'hasUpper', label: 'Letra maiúscula' },
  { key: 'hasNum', label: 'Número' },
  { key: 'matches', label: 'Senhas coincidem' },
]
