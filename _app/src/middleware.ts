import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Middleware de auth.
 * - Atualiza sessão do Supabase a cada request.
 * - Bloqueia rotas /admin/** sem usuário logado.
 * - Bloqueia /admin/super/** sem e-mail na whitelist (verificação cruzada com role no servidor depois).
 *
 * Rotas públicas (vitrine, /privacidade, /termos, /login etc.) passam livremente.
 */
export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  const path = request.nextUrl.pathname

  // Rotas que exigem usuário autenticado
  const requiresAuth = path.startsWith('/admin')
  const requiresSuperAdmin = path.startsWith('/admin/super')

  if (requiresAuth && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', path)
    return NextResponse.redirect(loginUrl)
  }

  if (requiresSuperAdmin && user) {
    const allowedEmails = (process.env.SUPER_ADMIN_EMAILS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    const userEmail = user.email?.toLowerCase()
    if (!userEmail || !allowedEmails.includes(userEmail)) {
      // Camada 1 (whitelist). A camada 2 (role na tabela profiles) é checada nas
      // rotas de API/server actions que tocam dados sensíveis.
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Roda em todas as rotas exceto:
     * - _next/static, _next/image, favicon, public assets
     * - rotas com extensão (imagens, fontes etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
}
