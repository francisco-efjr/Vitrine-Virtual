'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Supabase client para uso em Client Components do browser.
 * RLS é aplicada automaticamente via JWT do usuário logado.
 */
export function createClient() {
  if (_client) return _client
  _client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  return _client
}
