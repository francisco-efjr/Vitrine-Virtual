import 'server-only'
import { logger } from '@/lib/logger'
import { isAllowedResultUrl } from '@/lib/security/url-allowlist'
import { detectGarmentText, editDistance } from './acceptance/garment-text'
import { runTier, type TryOnTier, type TryOnTierInput, type TryOnTierResult } from './tiers'

/**
 * Best-of-N condicional — research §4.1 P0.4.
 *
 * Quando a peça tem texto/logo (modo de falha universal #1), gera N amostras
 * em paralelo e escolhe a com menor edit distance no OCR do output vs
 * texto do input. Custo dobra/triplica SÓ nessa fração do catálogo
 * (estimativa: 15–25%).
 *
 * Defaults conservadores:
 *   - Feature flag: `TRY_ON_BEST_OF_N_ENABLED` (default `false`).
 *   - N = 2 (configurável via `TRY_ON_BEST_OF_N_COUNT`).
 *   - Apenas em tiers configurados como `supportsBestOfN` (hoje vazio até
 *     FASHN/Replicate serem ativados — Gemini é caro pra rodar 2× por
 *     request sem ROI claro).
 *
 * Estratégia de score:
 *   - Roda OCR no resultado de cada amostra.
 *   - Score = editDistance(garmentText, outputText).
 *   - Menor score vence. Em empate, vence a primeira (timing wins).
 */

const TIERS_SUPPORTING_BEST_OF_N: readonly TryOnTier[] = [
  // Vazio por enquanto: Tier A/B virão quando FASHN/Replicate forem ativados.
  // Tier C (Gemini) NÃO entra por default — custo dobra por request sem
  // upside compensador. Mude a env TRY_ON_BEST_OF_N_TIERS pra forçar.
]

function isFeatureEnabled(): boolean {
  return process.env.TRY_ON_BEST_OF_N_ENABLED === 'true'
}

function resolvedSampleCount(): number {
  const raw = process.env.TRY_ON_BEST_OF_N_COUNT
  const n = raw ? Number.parseInt(raw, 10) : 2
  if (!Number.isFinite(n) || n < 2) return 2
  if (n > 4) return 4 // hard cap pra evitar runaway cost
  return n
}

function tierSupportsBestOfN(tier: TryOnTier): boolean {
  const override = process.env.TRY_ON_BEST_OF_N_TIERS
  if (override) {
    return override.split(',').map((s) => s.trim()).includes(tier)
  }
  return TIERS_SUPPORTING_BEST_OF_N.includes(tier)
}

export interface BestOfNContext {
  tier: TryOnTier
  /** Buffer da foto da peça pra rodar OCR. Pode ser vazio quando o use-case
   *  não conseguiu fetchar (signed URL expirada). */
  garmentBuffer: Buffer
  /** MIME type da foto (default image/jpeg). */
  garmentMimeType?: string
}

export interface BestOfNResult {
  result: TryOnTierResult
  /** Quantas amostras realmente foram geradas (1 = no-op). */
  samplesGenerated: number
  /** Texto detectado na peça via OCR. */
  garmentText?: string
  /** Score (edit distance) do resultado escolhido. */
  winnerScore?: number
  /** Por que o best-of-N foi (ou não foi) acionado. */
  reason:
    | 'feature_disabled'
    | 'tier_not_supported'
    | 'ocr_no_text'
    | 'ocr_unavailable'
    | 'best_of_n_applied'
    | 'all_samples_failed'
}

/**
 * Wrapper sobre runTier que decide entre 1 chamada simples ou N+score.
 *
 * Nunca lança em decisões de gating — qualquer erro de OCR ou
 * indisponibilidade de feature degrada pra single-sample (`runTier` direto).
 */
export async function runWithBestOfN(
  input: TryOnTierInput,
  ctx: BestOfNContext,
): Promise<BestOfNResult> {
  // Gate 1: feature flag
  if (!isFeatureEnabled()) {
    const result = await runTier(ctx.tier, input)
    return { result, samplesGenerated: 1, reason: 'feature_disabled' }
  }

  // Gate 2: tier compatível
  if (!tierSupportsBestOfN(ctx.tier)) {
    const result = await runTier(ctx.tier, input)
    return { result, samplesGenerated: 1, reason: 'tier_not_supported' }
  }

  // Gate 3: OCR detecta texto na peça
  const ocr = await detectGarmentText(ctx.garmentBuffer, ctx.garmentMimeType)
  if (ocr.source === 'unavailable') {
    const result = await runTier(ctx.tier, input)
    return { result, samplesGenerated: 1, reason: 'ocr_unavailable' }
  }
  if (!ocr.hasText) {
    const result = await runTier(ctx.tier, input)
    return {
      result,
      samplesGenerated: 1,
      garmentText: '',
      reason: 'ocr_no_text',
    }
  }

  // Gate 4: gera N em paralelo + score
  const N = resolvedSampleCount()
  logger.info('Try-on best-of-N acionado', {
    tier: ctx.tier,
    samples: N,
    garmentTextSnippet: ocr.text.slice(0, 60),
  })

  const samples = await Promise.allSettled(
    Array.from({ length: N }, () => runTier(ctx.tier, input)),
  )
  const successful = samples
    .map((s, idx) => ({ s, idx }))
    .filter((x): x is { s: PromiseFulfilledResult<TryOnTierResult>; idx: number } =>
      x.s.status === 'fulfilled',
    )

  if (successful.length === 0) {
    // Re-lança o primeiro erro pra preservar comportamento de "tier falhou"
    const first = samples.find((s) => s.status === 'rejected') as
      | PromiseRejectedResult
      | undefined
    if (first) throw first.reason
    throw new Error('best-of-n: nenhuma sample concluída')
  }

  // Score: OCR + edit distance vs texto da peça
  const scored = await Promise.all(
    successful.map(async ({ s, idx }) => {
      const r = s.value
      let score = Number.POSITIVE_INFINITY
      if (isAllowedResultUrl(r.resultUrl)) {
        try {
          const buf = await fetchResultBuffer(r.resultUrl)
          if (buf) {
            const outputOcr = await detectGarmentText(buf, 'image/jpeg')
            score = editDistance(ocr.text, outputOcr.text)
          }
        } catch (err) {
          logger.warn('best-of-n: score falhou pra sample', {
            sampleIdx: idx,
            message: err instanceof Error ? err.message : String(err),
          })
        }
      }
      return { result: r, score, idx }
    }),
  )
  scored.sort((a, b) => a.score - b.score)
  const winner = scored[0]!
  logger.info('Try-on best-of-N escolhido', {
    samples: N,
    winnerIdx: winner.idx,
    winnerScore: winner.score,
    allScores: scored.map((s) => s.score),
  })
  return {
    result: winner.result,
    samplesGenerated: successful.length,
    garmentText: ocr.text,
    winnerScore: winner.score,
    reason: 'best_of_n_applied',
  }
}

async function fetchResultBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const arr = await res.arrayBuffer()
    return Buffer.from(arr)
  } catch {
    return null
  }
}
