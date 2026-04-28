import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> }

/**
 * Supabase client para uso em Server Components, Route Handlers e Server Actions.
 * Lê/escreve cookies de sessão do usuário logado. RLS é aplicada via JWT.
 */
export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Next tipa `options` de forma mais estrita; aqui basta repassar no runtime.
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll é chamado durante render — Next bloqueia escrita.
            // Nesses casos a renovação de token acontece via middleware, então OK ignorar.
          }
        },
      },
    },
  )
}
