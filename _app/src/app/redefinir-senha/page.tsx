import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { DefinirSenhaForm } from '@/components/auth/definir-senha-form'
import { getSession } from '@/server/auth/session'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Redefinir senha · Vitrine Virtual',
  robots: { index: false, follow: false },
}

/**
 * Tela usada após clicar no link enviado por "esqueci minha senha".
 * O Supabase cria sessão temporária via magic link, cai aqui,
 * e o usuário define nova senha.
 */
export default async function RedefinirSenhaPage() {
  const session = await getSession()
  if (!session) redirect('/login?error=sessao_expirada')

  return <DefinirSenhaForm mode="reset" />
}
