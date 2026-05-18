import 'server-only'
import { getServerEnv } from '@/lib/env'
import type { AiImageModel } from '@/types/database'

/**
 * Mapeia o rótulo de qualidade escolhido por loja (Super-Admin) para o nome
 * técnico do modelo Gemini. O nome técnico NUNCA é exposto na UI — só "High"
 * e "Medium" aparecem para o usuário.
 *
 *   High   → GOOGLE_AI_MODEL           (gemini-3.1-flash-image-preview, recomendado)
 *   Medium → GOOGLE_AI_FALLBACK_MODEL  (gemini-2.5-flash-image, GA — padrão)
 *
 * Default de plataforma = 'medium' (igual ao mock do design e ao modelo GA já
 * em produção) → lojas existentes não mudam de comportamento.
 */

export const AI_IMAGE_MODELS = ['high', 'medium'] as const
export const DEFAULT_AI_IMAGE_MODEL: AiImageModel = 'medium'

export function isAiImageModel(v: unknown): v is AiImageModel {
  return v === 'high' || v === 'medium'
}

/** Rótulo amigável (caso precise renderizar fora do componente segmentado). */
export const AI_IMAGE_MODEL_LABEL: Record<AiImageModel, string> = {
  high: 'High',
  medium: 'Medium',
}

/**
 * Resolve o nome técnico do modelo Gemini para a loja.
 * `null`/inválido cai no default de plataforma (medium).
 */
export function resolveGoogleModel(setting: AiImageModel | null | undefined): string {
  const env = getServerEnv()
  const effective: AiImageModel = isAiImageModel(setting) ? setting : DEFAULT_AI_IMAGE_MODEL
  return effective === 'high' ? env.GOOGLE_AI_MODEL : env.GOOGLE_AI_FALLBACK_MODEL
}
