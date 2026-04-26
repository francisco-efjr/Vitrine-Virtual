import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Callback de magic link / OAuth.
 *
 * Fluxos suportados:
 *   - Convite (super-admin convidou loja): `?type=invite&next=/admin/definir-senha`
 *   - Recuperação de senha:               `?type=recovery&next=/redefinir-senha`
 *   - Login com magic link genérico:      `?next=/admin` (default)
 *
 * Whitelist de `next` para evitar open redirect:
 * só aceita paths internos (que começam com /).
 */

const ALLOWED_NEXT_PREFIXES = ['/admin', '/redefinir-senha']
const DEFAULT_NEXT = '/admin'

function safeNext(input: string | null): string {
  if (!input) return DEFAULT_NEXT
  if (!input.startsWith('/')) return DEFAULT_NEXT
  if (input.startsWith('//')) return DEFAULT_NEXT // protocol-relative
  if (!ALLOWED_NEXT_PREFIXES.some((p) => input === p || input.startsWith(`${p}/`))) {
    return DEFAULT_NEXT
  }
  return input
}

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
