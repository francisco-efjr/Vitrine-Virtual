import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_NEXT, safeNext } from '@/lib/auth/safe-next'

/**
 * Callback de magic link / OAuth.
 *
 * Fluxos suportados:
 *   - Convite (super-admin convidou loja): `?type=invite&next=/admin/definir-senha`
 *   - Recuperação de senha:               `?type=recovery&next=/redefinir-senha`
 *   - Login com magic link genérico:      `?next=/admin` (default)
 *
 * Proteção contra open redirect centralizada em @/lib/auth/safe-next.
 */

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const requestedNext = searchParams.get('next')

  // Tipo do link define o destino default quando `next` não foi passado
  const inferredNext =
    requestedNext ??
    (type === 'invite' ? '/admin/definir-senha' : type === 'recovery' ? '/redefinir-senha' : DEFAULT_NEXT)
  const next = safeNext(inferredNext)

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=callback_failed`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
