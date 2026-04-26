import 'server-only'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { getSuperAdminEmails } from '@/lib/env'
import type { LojaRow, ProfilesRow } from '@/types/database'

/**
 * Sessão server-side: usuário + perfil + loja (se houver).
 * Usado em Server Components, Route Handlers e Server Actions.
 *
 * RLS faz a maior parte do isolamento, mas helpers como `requireLojista` e
 * `requireSuperAdmin` adicionam check explícito antes de chamar service-role
 * ou rotas administrativas.
 */

export interface AuthSession {
  user: { id: string; email: string }
  profile: ProfilesRow
  loja: LojaRow | null
  isSuperAdmin: boolean
}

export async function getSession(): Promise<AuthSession | null> {
  const supabase = createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !user.email) return null

  const [{ data: profile }, { data: loja }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('lojas').select('*').eq('owner_user_id', user.id).maybeSingle(),
  ])

  if (!profile) return null

  // Camada de defesa em profundidade: super-admin = whitelist de e-mail E role na tabela.
  const isSuperAdmin =
    profile.role === 'super_admin' &&
    getSuperAdminEmails().includes(user.email.toLowerCase())

  return {
    user: { id: user.id, email: user.email },
    profile,
    loja: loja ?? null,
    isSuperAdmin,
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number = 401,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

export async function requireSession(): Promise<AuthSession> {
  const session = await getSession()
  if (!session) throw new AuthError('Não autenticado', 401)
  return session
}

export async function requireLojista(): Promise<AuthSession & { loja: LojaRow }> {
  const session = await requireSession()
  if (!session.loja) throw new AuthError('Loja não encontrada para este usuário', 403)
  return session as AuthSession & { loja: LojaRow }
}

export async function requireSuperAdmin(): Promise<AuthSession> {
  const session = await requireSession()
  if (!session.isSuperAdmin) throw new AuthError('Acesso restrito', 403)
  return session
}
