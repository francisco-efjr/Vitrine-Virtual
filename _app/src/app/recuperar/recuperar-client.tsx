'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Mail } from 'lucide-react'
import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { createClient } from '@/lib/supabase/client'

export function RecuperarSenhaClient() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || loading) return
    setLoading(true)
    const supabase = createClient()
    // Anti-enumeration: a UI mostra a mesma mensagem genérica seja qual for o resultado.
    // Não importa se a conta existe ou não — não revelamos.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/redefinir-senha`,
    })
    setLoading(false)
    setSent(true)
  }

  return (
    <AuthShell>
      {!sent ? (
        <>
          <h1 className="mb-2 text-center font-serif text-[26px] font-semibold text-ink">
            Recuperar senha
          </h1>
          <p className="mb-7 text-center text-sm leading-relaxed text-ink-2">
            Informe o e-mail da sua conta e enviaremos um link para redefinir sua senha.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="E-mail"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seunome@email.com"
            />
            <Button
              type="submit"
              variant="dark"
              size="lg"
              disabled={!email || loading}
              className="w-full"
            >
              {loading ? <Spinner size={16} className="text-white" /> : null}
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </Button>
          </form>
          <div className="mt-5 text-center">
            <Link href="/login" className="text-[13px] text-ink-3 underline decoration-border">
              ← Voltar ao login
            </Link>
          </div>
        </>
      ) : (
        <div className="py-2 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-success-light text-success">
            <Mail size={24} />
          </div>
          <h2 className="mb-2.5 font-serif text-2xl font-semibold text-ink">Verifique seu e-mail</h2>
          <p className="mb-6 text-sm leading-relaxed text-ink-2">
            Se existe uma conta com <strong>{email}</strong>, você receberá um link de recuperação
            em breve. Verifique também sua caixa de spam.
          </p>
          <Button
            variant="ghost"
            className="w-full justify-center"
            onClick={() => {
              setSent(false)
              setEmail('')
            }}
          >
            Usar outro e-mail
          </Button>
          <div className="mt-4">
            <Link href="/login" className="text-[13px] text-ink-3 underline decoration-border">
              ← Voltar ao login
            </Link>
          </div>
        </div>
      )}
    </AuthShell>
  )
}
