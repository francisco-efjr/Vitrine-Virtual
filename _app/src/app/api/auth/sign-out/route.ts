import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = createClient()
  await supabase.auth.signOut({ scope: 'local' })
  // 303 See Other força o browser a fazer GET no destino. Sem isso o default
  // 307 preserva o método e o browser re-envia POST para /login → erro.
  return NextResponse.redirect(new URL('/login', req.url), 303)
}
