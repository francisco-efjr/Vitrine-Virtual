import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { DefinirSenhaForm } from '@/components/auth/definir-senha-form'
import { getSession } from '@/server/auth/session'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Defina sua senha · Vitrine Virtual',
  robots: { index: false, follow: false },
}

/**
 * Tela usada quando a lojista chega via magic link de convite.
 * O fluxo é:
 *   1. Super-admin convida → Supabase envia magic link
 *   2. Cliente clica → /auth/callback troca code por sessão
 *   3. Callback redireciona para esta página
 *   4. Lojista define senha
 *   5. Vai para /admin
 *
 * Esta página exige usuário autenticado (sessão via magic link).
 */
export default async function DefinirSenhaPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return <DefinirSenhaForm mode="invite" inviteForLojaNome={session.loja?.nome ?? null} />
}
