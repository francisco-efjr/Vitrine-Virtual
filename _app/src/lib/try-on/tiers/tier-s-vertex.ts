import 'server-only'
import { logger } from '@/lib/logger'
import {
  TierNotImplementedError,
  type TryOnTierHandler,
  type TryOnTierInput,
  type TryOnTierResult,
} from './types'

/**
 * Tier S — Vertex AI VTO (calçados).
 *
 * Status: **STUB / NOT IMPLEMENTED — research §4.3 P2.14**.
 *
 * Por que existe:
 *   - Vertex AI Virtual Try-On é o único provider com performance comprovada
 *     em CALÇADOS. FASHN/Kling/Gemini têm dificuldade com sapatos —
 *     proporção, perspectiva e detalhes da sola/cadarço ficam errados.
 *   - Vertex AI VTO API beta 08-04 adicionou suporte explícito a
 *     "shoes" como categoria com pipeline dedicado.
 *
 * Roteamento:
 *   - `chooseTier()` retorna `tier_s_vertex` quando `garmentCategory === 'footwear'`.
 *   - Quando enabled=false (default), `resolveEnabledTier` cai pra Tier C
 *     (Gemini) — qualidade pior mas não bloqueia.
 *
 * Quando implementar:
 *   - Endpoint: us-central1-aiplatform.googleapis.com/v1/projects/{PROJECT}/locations/us-central1/publishers/google/models/virtual-try-on-preview-08-04:predict
 *   - Auth: GCP service account JWT (não API key) — adicionar VERTEX_AI_KEY ao env
 *   - Body:
 *     {
 *       "instances": [{
 *         "personImage": { "image": { "bytesBase64Encoded": <customer> } },
 *         "productImages": [{ "image": { "bytesBase64Encoded": <garment> } }],
 *         "category": "shoes"
 *       }],
 *       "parameters": { "sampleCount": 1, "addWatermark": false }
 *     }
 *   - Custo: ~$0.30 por geração (4× mais caro que Gemini)
 *
 * Cost guard:
 *   - Adicionar coluna `tier_s_vertex_quota_mensal` em lojas
 *   - Cota separada de Tier C (não compartilha pool)
 *
 * Enablement:
 *   - TRY_ON_TIER_S_ENABLED=true env flag
 *   - + GCP_PROJECT_ID + VERTEX_AI_SERVICE_ACCOUNT_JSON env vars
 *
 * Cota por loja:
 *   - Feature flag `lojas.tier_s_enabled boolean` — só lojas premium ativam.
 *   - sem flag, mesmo com env on, cai pra Tier C.
 */
export const tierSVertex: TryOnTierHandler = {
  tier: 'tier_s_vertex',
  enabled: process.env.TRY_ON_TIER_S_ENABLED === 'true', // OFF by default
  description:
    'Tier S — Vertex AI VTO. Dedicated pipeline for footwear/shoes. Premium provider ~$0.30/gen. Not wired today.',

  async run(_input: TryOnTierInput): Promise<TryOnTierResult> {
    logger.warn('Try-on tier: Tier S invoked but not implemented')
    throw new TierNotImplementedError(
      'tier_s_vertex',
      'Read _app/src/lib/try-on/tiers/tier-s-vertex.ts top comment for the full integration checklist before implementing.',
    )
  },
}
