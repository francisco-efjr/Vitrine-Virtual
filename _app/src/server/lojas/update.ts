import 'server-only'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { lojaUpdateSchema, type LojaUpdateInput } from '@/lib/validators/loja'
import { LojaError } from './errors'
import { logger } from '@/lib/logger'
import type { LojaRow } from '@/types/database'

/**
 * Atualiza dados da loja do usuário logado.
 * RLS garante que só a loja do usuário pode ser modificada (defesa em profundidade).
 */
export async function updateOwnLoja(
  lojaId: string,
  input: LojaUpdateInput,
): Promise<LojaRow> {
  const data = lojaUpdateSchema.parse(input)

  // Trata strings vazias como null para campos opcionais
  const cleaned: Record<string, unknown> = { ...data }
  for (const k of ['instagram', 'tiktok', 'whatsapp_e164', 'tagline'] as const) {
    if (cleaned[k] === '') cleaned[k] = null
  }

  const supabase = createServerSupabase()
  const { data: loja, error } = await supabase
    .from('lojas')
    .update(cleaned)
    .eq('id', lojaId)
    .select('*')
    .single()

  if (error || !loja) {
    logger.error('Erro ao atualizar loja', { code: error?.message })
    throw new LojaError('Falha ao atualizar loja', 'UPDATE_FAIL', 500)
  }

  return loja
}
