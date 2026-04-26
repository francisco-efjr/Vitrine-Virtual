import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getServerEnv } from '@/lib/env'

/**
 * Supabase client com SERVICE_ROLE — bypass de RLS.
 *
 * ⚠️  USAR APENAS EM CÓDIGO SERVER ESPECÍFICO:
 *   - Rota /api/try-on (precisa inserir log mesmo sem usuário logado)
 *   - Painel super-admin (precisa criar lojas e usuários)
 *   - Cron de kill switch (precisa ler todas as lojas)
 *
 * NUNCA exponha esta key no front. NUNCA use em rota acessível por usuário comum.
 */
export function createServiceClient() {
  const env = getServerEnv()
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  )
}
