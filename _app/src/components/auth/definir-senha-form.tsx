'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Check, Mail } from 'lucide-react'
import { AuthShell } from '@/components/auth/auth-shell'
import { PasswordStrength } from '@/components/auth/password-strength'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { checkPassword } from '@/lib/auth/password-rules'
import { createClient } from '@/lib/supabase/client'

/**
 * Tela de definir senha. Dois modos:
 * - `invite` — primeira vez (lojista convidada). Após salvar, vai para /admin.
 * - `reset` — redefinição. Após salvar, vai para /login.
 *
 * Pré-condição: usuário precisa estar autenticado (Supabase Auth criou sessão
 * temporária após exchange do code do magic link em /auth/callback).
 */
export function DefinirSenhaForm({
  mode,
  inviteForLojaNome,
}: {
  mode: 'invite' | 'reset'
  inviteForLojaNome?: string | null
}) {
  const router = useRouter()
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checks = checkPassword(senha, confirmar)
  const isInvite = mode === 'invite'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!checks.valid || loading) return
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password: senha })
    setLoading(false)
    if (err) {
      setError(err.message ?? 'Não foi possível salvar sua senha agora.')
      return
    }
    setDone(true)
    // Auto-redirect após 1.2s
    setTimeout(() => {
      router.replace(isInvite ? '/admin' : '/login')
      router.refresh()
    }, 1200)
  }

  if (done) {
    return (
      <AuthShell>
        <div className="py-2 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-success-light text-success">
            <Check size={26} strokeWidth={3} />
          </div>
          <h2 className="mb-2.5 font-serif text-2xl font-semibold text-ink">
            {isInvite ? 'Tudo pronto!' : 'Senha redefinida!'}
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-ink-2">
            {isInvite
              ? 'Sua conta foi criada. Você já pode acessar o painel da sua loja.'
              : 'Sua senha foi atualizada com sucesso. Você pode fazer login agora.'}
          </p>
          <Button
            variant="dark"
            size="lg"
            className="w-full justify-center"
            onClick={() => router.replace(isInvite ? '/admin' : '/login')}
          >
            {isInvite ? 'Acessar minha vitrine →' : 'Ir para o login →'}
          </Button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      {isInvite ? (
        <div className="mb-6 flex items-start gap-2.5 rounded-[10px] bg-accent-light p-3.5">
          <Mail size={16} className="mt-0.5 shrink-0 text-accent-dark" />
          <div>
            <div className="text-[13px] font-semibold text-accent-dark">Convite recebido</div>
            <div className="mt-0.5 text-xs leading-relaxed text-accent-dark">
              Você foi convidada
              {inviteForLojaNome ? (
                <>
                  {' '}para <strong>{inviteForLojaNome}</strong>
                </>
              ) : null}
              {' '}na vitrine.app. Defina sua senha para começar.
            </div>
          </div>
        </div>
      ) : null}

      <h1 className="mb-2 text-center font-serif text-[26px] font-semibold text-ink">
        {isInvite ? 'Defina sua senha' : 'Nova senha'}
      </h1>
      <p className="mb-6 text-center text-sm leading-relaxed text-ink-2">
        {isInvite
          ? 'Você está quase lá! Crie uma senha segura para sua conta.'
          : 'Escolha uma nova senha para sua conta.'}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="relative">
          <Input
            label="Nova senha"
            type={showSenha ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowSenha((s) => !s)}
            aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute bottom-2.5 right-3 text-xs text-ink-3 hover:text-ink"
          >
            {showSenha ? 'ocultar' : 'ver'}
          </button>
        </div>

        <Input
          label="Confirmar senha"
          type={showSenha ? 'text' : 'password'}
          autoComplete="new-password"
          required
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          placeholder="••••••••"
          error={confirmar.length > 0 && !checks.matches ? 'As senhas não coincidem' : undefined}
        />

        <PasswordStrength password={senha} confirmation={confirmar} />

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <Button
          type="submit"
          variant="dark"
          size="lg"
          disabled={!checks.valid || loading}
          className="mt-1 w-full justify-center"
        >
          {loading ? <Spinner size={16} className="text-white" /> : null}
          {loading
            ? 'Salvando...'
            : isInvite
              ? 'Salvar senha e acessar'
              : 'Redefinir senha'}
        </Button>
      </form>
    </AuthShell>
  )
}
