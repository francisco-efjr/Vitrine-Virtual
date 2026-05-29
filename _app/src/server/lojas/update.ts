import 'server-only'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { lojaUpdateSchema, type LojaUpdateInput } from '@/lib/validators/loja'
import { LojaError } from './errors'
import { logger } from '@/lib/logger'
import type { AiImageModel, LojaRow, VitrineTheme } from '@/types/database'

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

// ── Mutações administrativas (super-admin) — movidas de list.ts (BUG-010) ──
// Usam service client (bypassa RLS). O caller DEVE ter passado por
// requireSuperAdmin() antes de invocar.

/** Ativa/desativa uma loja. Super-admin only. */
export async function setLojaAtiva(lojaId: string, ativa: boolean): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase.from('lojas').update({ ativa }).eq('id', lojaId)
  if (error) throw error
}

/** Atualiza o modelo de imagem (High/Medium) de uma loja. Super-admin only. */
export async function setLojaAiModel(
  lojaId: string,
  aiImageModel: AiImageModel,
): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('lojas')
    .update({ ai_image_model: aiImageModel })
    .eq('id', lojaId)
  if (error) throw error
}

/**
 * Define o tema visual da vitrine pública (default ou um look dedicado, ex:
 * CasaGabyHarb). Super-admin only — escolha estratégica de identidade, não
 * configuração da lojista.
 */
export async function setLojaVitrineTheme(
  lojaId: string,
  vitrineTheme: VitrineTheme,
): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('lojas')
    .update({ vitrine_theme: vitrineTheme })
    .eq('id', lojaId)
  if (error) throw error
}
