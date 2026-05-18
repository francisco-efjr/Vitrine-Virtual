'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { VVLogo } from '@/components/brand/vv-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { safeNext } from '@/lib/auth/safe-next'

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  // BUG-007: validar `next` para impedir open redirect (ex: ?next=https://evil.com)
  const next = safeNext(params.get('next'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      setError('E-mail ou senha incorretos.')
      return
    }
    router.replace(next)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <VVLogo />
        </div>
        <div className="space-y-2 text-center">
          <h1 className="font-serif text-3xl font-semibold text-ink">Entrar</h1>
          <p className="text-sm text-ink-2">Acesse o painel da sua loja</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="E-mail"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Senha"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button variant="dark" size="lg" type="submit" disabled={loading} className="w-full">
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
        <p className="text-center text-xs text-ink-3">
          Esqueceu a senha?{' '}
          <a href="/recuperar" className="text-accent hover:underline">
            Recuperar acesso
          </a>
        </p>
      </div>
    </div>
  )
}
