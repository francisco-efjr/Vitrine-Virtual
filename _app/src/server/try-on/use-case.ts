import 'server-only'
import { logger } from '@/lib/logger'
import { hashIp } from '@/lib/security/ip-hash'
import { isAllowedResultUrl } from '@/lib/security/url-allowlist'
import { createServiceClient } from '@/lib/supabase/service'
import {
  composeRetryPrompt,
  runAcceptanceChecks,
  type AcceptanceResult,
} from '@/lib/try-on/acceptance'
import { detectMirrorSelfie } from '@/lib/try-on/acceptance/mirror-selfie-detect'
import { runTier } from '@/lib/try-on/tiers'
import type { SafetyRating } from '@/lib/try-on/types'
import { isTryOnEnabled } from '@/lib/try-on/kill-switch'
import { buildTryOnProviderInput } from '@/lib/try-on/payload'
import { detectGarmentHasPerson } from '@/lib/try-on/image-composition'
import { composeFinalPrompt } from '@/lib/try-on/prompts/compose'
import { validateCustomerPhotoWithAi } from '@/lib/try-on/validators/customer-photo-ai'
import {
  combineGateResults,
  evaluateCustomerPhoto,
  evaluateGarmentPhoto,
  type CustomerPhotoSignals,
  type GarmentPhotoSignals,
  type RejectionReason,
} from '@/lib/try-on/quality-gate'
import { checkTryOnRateLimit } from '@/lib/try-on/rate-limit'
import {
  chooseTier,
  type TierRouteContext,
  type TryOnPromptVariables,
  type TryOnTier,
} from '@/lib/try-on/tiers'
import { runWithBestOfN } from '@/lib/try-on/best-of-n'
import { verifyTurnstileToken } from '@/lib/try-on/turnstile'
import { resolveGoogleModel } from '@/lib/try-on/model-selection'
import { buildLojaAssetPublicUrl } from '@/server/lojas/assets'
import { checkLojaQuota } from './quota'
import { recordGeneration } from './generation-log'
import type { AiImageModel } from '@/types/database'

export type TryOnError =
  | { kind: 'kill_switch_off' }
  | { kind: 'turnstile_failed' }
  | { kind: 'rate_limit'; reason: 'hour' | 'day' | 'week'; resetAt?: number }
  | { kind: 'quota_exceeded'; used: number; limit: number }
  | { kind: 'peca_unavailable' }
  | { kind: 'gate_rejected'; reason: RejectionReason }
  | { kind: 'provider_failed'; message: string }

export interface TryOnSuccess {
  ok: true
  resultUrl: string
  expiresAt: string
  // Mantemos 'google' por compatibilidade com dados/histórico, mas hoje esse fluxo
  // representa o provider Gemini Nano Banana.
  provider: 'fashn' | 'replicate' | 'google' | 'openai'
  /** Id da geração na base de qualidade — usado pelo feedback opcional. */
  generationId?: string | null
}

export type TryOnResult = TryOnSuccess | { ok: false; error: TryOnError }

export interface RunTryOnInput {
  pecaId: string
  turnstileToken: string
  customerPhoto: string
  ip: string
  sessionId?: string
  garmentImageUrlOverride?: string | null
  /** Signals do quality gate computados no cliente (research §5). Opcional —
   * quando ausente, a geração roda como antes (compat. com clientes antigos). */
  customerSignals?: CustomerPhotoSignals | null
  garmentSignals?: GarmentPhotoSignals | null
}

/**
 * Caso de uso completo do provador virtual.
 * Aplica as 4 camadas anti-abuso (ADR 0004) na ordem correta antes de chamar a IA.
 *
 * IMPORTANTE (ADR 0006): a foto do cliente final NUNCA é persistida.
 * - Recebida em memória.
 * - Enviada ao provider com opt-out de retenção.
 * - Descartada após o response.
 * - O log só guarda metadados (ip_hash, peca_id, success, provider, request_id).
 */
export async function runTryOn(input: RunTryOnInput): Promise<TryOnResult> {
  const supabase = createServiceClient()
  const ipHash = hashIp(input.ip)
  const t0 = Date.now()

  if (!(await isTryOnEnabled())) {
    return { ok: false, error: { kind: 'kill_switch_off' } }
  }

  const turnstileOk = await verifyTurnstileToken(input.turnstileToken, input.ip)
  if (!turnstileOk) {
    return { ok: false, error: { kind: 'turnstile_failed' } }
  }

  const rl = await checkTryOnRateLimit(ipHash)
  if (!rl.ok) {
    return {
      ok: false,
      error: { kind: 'rate_limit', reason: rl.reason!, resetAt: rl.reset },
    }
  }

  const { data: peca } = await supabase
    .from('pecas')
    .select('id, nome, status, loja_id, foto_principal_id')
    .eq('id', input.pecaId)
    .maybeSingle()

  if (!peca || peca.status !== 'disponivel') {
    return { ok: false, error: { kind: 'peca_unavailable' } }
  }

  const { data: loja } = await supabase
    .from('lojas')
    .select(
      'id, ativa, cota_try_on_mensal, provador_fundo_storage_path, provador_fundo_tipo, ai_image_model',
    )
    .eq('id', peca.loja_id)
    .single()

  if (!loja?.ativa) {
    return { ok: false, error: { kind: 'peca_unavailable' } }
  }

  const quota = await checkLojaQuota(loja.id, loja.cota_try_on_mensal)
  if (!quota.ok) {
    return {
      ok: false,
      error: { kind: 'quota_exceeded', used: quota.used, limit: quota.limit },
    }
  }

  let garmentUrl = input.garmentImageUrlOverride ?? ''
  let garmentStoragePath: string | null = null
  if (!garmentUrl && peca.foto_principal_id) {
    const { data: foto } = await supabase
      .from('pecas_fotos')
      .select('storage_path')
      .eq('id', peca.foto_principal_id)
      .single()

    if (foto?.storage_path) {
      garmentStoragePath = foto.storage_path
      const { data: signed } = await supabase.storage
        .from('pecas-fotos')
        .createSignedUrl(foto.storage_path, 60 * 5)
      garmentUrl = signed?.signedUrl ?? ''
    }
  }

  if (!garmentUrl) {
    return { ok: false, error: { kind: 'peca_unavailable' } }
  }

  // ─── Quality gate (research §5, design v4) ─────────────────────────────
  //
  // Soft-by-default: o design (chat7) explicitamente diz para NÃO bloquear
  // o usuário quando o sistema não identifica rosto/blur/iluminação. Em vez
  // disso, geramos mesmo assim — o resultado pode ser ruim mas é o que o
  // cliente pediu. Os signals continuam sendo coletados/logados para tuning.
  //
  // Só duas razões mantêm hard-block:
  //   - low_resolution  → Gemini falha com imagens minúsculas
  //   - garment_unclear → sem peça reconhecível não há try-on possível
  //
  // Resto vira proceed_with_warning. O cliente já viu a foto antes de enviar;
  // o servidor confia.
  const HARD_BLOCK_REASONS: ReadonlySet<RejectionReason> = new Set([
    'low_resolution',
    'garment_unclear',
  ])

  let gateVerdict: 'proceed' | 'proceed_with_warning' | 'reject' | null = null
  let gateReason: RejectionReason | null = null
  let gateSignalsForLog: Record<string, unknown> | null = null

  if (input.customerSignals) {
    const customerResult = evaluateCustomerPhoto(input.customerSignals, {
      garmentCategory: 'auto',
    })
    const garmentResult = input.garmentSignals ? evaluateGarmentPhoto(input.garmentSignals) : null
    const combined = garmentResult
      ? combineGateResults(customerResult, garmentResult)
      : customerResult

    gateVerdict = combined.verdict
    gateReason = combined.reason ?? null
    gateSignalsForLog = {
      customer: input.customerSignals,
      garment: input.garmentSignals ?? null,
      warnings: combined.warnings,
    }

    if (
      combined.verdict === 'reject' &&
      combined.reason &&
      HARD_BLOCK_REASONS.has(combined.reason)
    ) {
      // Log da rejeição (best-effort) — sem gastar Gemini, sem salvar foto.
      await recordGeneration({
        lojaId: loja.id,
        pecaId: peca.id,
        sessionId: input.sessionId ?? null,
        ipHash,
        aiImageModel: (loja.ai_image_model ?? null) as AiImageModel | null,
        status: 'error',
        errorCode: `gate_${combined.reason}`,
        gateVerdict,
        gateReason: combined.reason,
        gateSignals: gateSignalsForLog,
      })

      logger.info('Try-on: gate hard-block antes do provider', {
        reason: combined.reason,
        warnings: combined.warnings,
      })
      return {
        ok: false,
        error: { kind: 'gate_rejected', reason: combined.reason },
      }
    }

    if (combined.verdict === 'reject') {
      // Reject "soft": downgrade pra warning + segue gerando. Loga pro tuning.
      logger.info('Try-on: gate soft warning (design v4 não-bloqueante)', {
        reason: combined.reason,
        warnings: combined.warnings,
      })
      gateVerdict = 'proceed_with_warning'
    }
  }

  // ─── AI server-side validation (request v6) ───────────────────────────
  //
  // Validação server-side por Gemini Vision (com fallback pros client signals
  // se Gemini falhar). Bloqueia HARD quando o AI confirma foto inválida
  // (sem rosto, várias pessoas, corpo cortado, blur).
  //
  // Diferente do quality gate acima (que é soft-by-default), este é
  // hard-by-design — o usuário pediu explicitamente: "preciso que o sistema
  // realmente valide se o upload do cliente é válido… caso contrário,
  // retornar a mensagem para o usuário". Qualidade > performance.
  //
  // Erro de infra do Gemini Vision = passa permissivo. Nunca rejeitamos
  // só por rate-limit/network — UX > paranoia.
  const customerPhotoBuf = bufferFromDataUrl(input.customerPhoto)
  const customerPhotoMime = mimeFromDataUrl(input.customerPhoto) ?? 'image/jpeg'
  if (customerPhotoBuf) {
    const aiValidation = await validateCustomerPhotoWithAi(
      customerPhotoBuf,
      customerPhotoMime,
      input.customerSignals ?? null,
    )

    if (!aiValidation.valid && aiValidation.reason) {
      await recordGeneration({
        lojaId: loja.id,
        pecaId: peca.id,
        sessionId: input.sessionId ?? null,
        ipHash,
        aiImageModel: (loja.ai_image_model ?? null) as AiImageModel | null,
        status: 'error',
        errorCode: `ai_gate_${aiValidation.reason}`,
        gateVerdict: 'reject',
        gateReason: aiValidation.reason,
        gateSignals: {
          ai_validation: {
            source: aiValidation.source,
            reason: aiValidation.reason,
            detail: aiValidation.detail ?? null,
            raw: aiValidation.raw ?? null,
          },
          client_signals: input.customerSignals ?? null,
        },
      })

      logger.info('Try-on: AI gate hard-block antes do provider', {
        source: aiValidation.source,
        reason: aiValidation.reason,
        detail: aiValidation.detail,
      })
      return {
        ok: false,
        error: { kind: 'gate_rejected', reason: aiValidation.reason },
      }
    }

    logger.info('Try-on: AI validation aprovou foto do cliente', {
      source: aiValidation.source,
    })

    // Mirror selfie detection (cenário C05). Não bloqueia — só loga + anexa
    // ao gateSignals pra dashboard de calibração. UI notification fica como
    // follow-up (precisa de campo `clientHints` no TryOnSuccess).
    const mirrorRes = await detectMirrorSelfie(customerPhotoBuf)
    if (mirrorRes.detected) {
      logger.info('Try-on: mirror selfie detectado (warning)', {
        phoneCount: mirrorRes.phoneCount,
        closestPx: mirrorRes.closestPhoneToWristPx,
      })
    }
    gateSignalsForLog = {
      ...(gateSignalsForLog ?? {}),
      mirror_selfie: mirrorRes,
    }
  }

  const provadorFundoUrl =
    loja.provador_fundo_tipo === 'personalizado' && loja.provador_fundo_storage_path
      ? buildLojaAssetPublicUrl(loja.provador_fundo_storage_path)
      : null
  const providerBackground: { mode: 'white' | 'custom' | 'customer'; backgroundImage?: string } =
    loja.provador_fundo_tipo === 'cliente'
      ? { mode: 'customer' }
      : provadorFundoUrl
        ? { mode: 'custom', backgroundImage: provadorFundoUrl }
        : { mode: 'white' }

  logger.info('Try-on: fundo parametrizado da loja', {
    backgroundMode: providerBackground.mode,
    hasCustomBackground: Boolean(provadorFundoUrl),
  })

  const aiImageModel = (loja.ai_image_model ?? null) as AiImageModel | null
  const googleModelOverride = resolveGoogleModel(aiImageModel)

  // ─── Tier dispatch (research §4) ──────────────────────────────────────
  //
  // Hoje só Tier C está habilitado. chooseTier escolhe o ideal e
  // resolveEnabledTier (interno) faz fallback pra Tier C — gravamos os
  // dois pra rastrear o gap "ideal-vs-real" (dashboard de pitch de orçamento).
  const customerPhotoType = input.customerSignals?.detectedType ?? 'full_body'

  // Server-side garment classifier: detect whether the store's product photo
  // shows another person modeling the garment (vs. flat-lay). Used both for
  // tier routing (on-model → Tier A/FASHN when funded) and for logging.
  //
  // The client-side `garmentSignals.detectedPhotoType` is reserved for the
  // admin's upload form; the public try-on flow doesn't have it because the
  // garment comes straight from store storage.
  // Fetcha o buffer da peça uma vez — reusado pelo classifier de garmentPhotoType
  // E pelo best-of-N OCR-gating (research §4.1 P0.4).
  let garmentBuffer: Buffer | null = null
  try {
    garmentBuffer = await fetch(garmentUrl, { cache: 'no-store' })
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((buf) => (buf ? Buffer.from(buf) : null))
  } catch {
    // best-effort
  }

  let garmentPhotoType: 'flat-lay' | 'model' | 'auto' =
    input.garmentSignals?.detectedPhotoType ?? 'auto'
  if (garmentPhotoType === 'auto' && garmentBuffer) {
    try {
      garmentPhotoType = (await detectGarmentHasPerson(garmentBuffer)) ? 'model' : 'flat-lay'
    } catch {
      // Best-effort — falls back to 'auto' which still gets the strengthened
      // 'auto' delta in the prompt composer.
    }
  }

  const tierBackgroundMode: TierRouteContext['backgroundMode'] =
    providerBackground.mode === 'custom'
      ? 'store_background'
      : providerBackground.mode === 'customer'
        ? 'preserve_customer'
        : 'white'

  const routeCtx: TierRouteContext = {
    customerPhotoType,
    garmentPhotoType,
    garmentCategory: 'auto',
    backgroundMode: tierBackgroundMode,
    quality: 'quality',
  }
  const tierChosen: TryOnTier = chooseTier(routeCtx)

  const variables: TryOnPromptVariables = {
    customerPhotoType,
    garmentPhotoType,
    garmentCategory: 'auto',
    garmentDescription: peca.nome,
    backgroundMode: tierBackgroundMode,
    storeBackgroundReference: provadorFundoUrl ?? undefined,
    quality: 'quality',
    outputStyle: 'premium_studio',
    promptVariantId: 'v1.1-garment-first+variants+negative',
    safetyLevel: 'conservative',
  }
  const composedPrompt = composeFinalPrompt(variables)

  const providerInput = buildTryOnProviderInput({
    customerPhoto: input.customerPhoto,
    productImage: garmentUrl,
    background: providerBackground,
    googleModelOverride,
    promptOverride: composedPrompt.prompt,
    promptVariantId: composedPrompt.promptVariantId,
  })

  try {
    const bestOfN = await runWithBestOfN(
      { provider: providerInput, variables },
      {
        tier: tierChosen,
        garmentBuffer: garmentBuffer ?? Buffer.alloc(0),
        garmentMimeType: 'image/jpeg',
      },
    )
    let result = bestOfN.result
    let tierEffective = result.tier
    logger.info('Try-on best-of-N gating', {
      reason: bestOfN.reason,
      samplesGenerated: bestOfN.samplesGenerated,
      winnerScore: bestOfN.winnerScore ?? null,
    })

    // Acceptance checks (research §14) — best-effort, NUNCA bloqueia o cliente.
    let acceptance = await runAcceptancePostGen({
      customerPhotoDataUrl: input.customerPhoto,
      resultUrl: result.resultUrl,
      garmentUrl,
      safetyRatings: result.safetyRatings,
      // Reusa OCR do best-of-N (evita chamada dupla ao Gemini) quando disponível
      garmentOcrText: bestOfN.garmentText,
    })
    if (acceptance) {
      logger.info('Try-on acceptance result', {
        pass: acceptance.pass,
        shouldRetry: acceptance.shouldRetry,
        checks: acceptance.checks.map((c) => ({
          name: c.name,
          pass: c.pass,
          checked: c.checked,
        })),
      })
    }

    // ─── Retry inteligente (P1.7) ────────────────────────────────────────
    //
    // Quando o acceptance pede retry (cor/texto/identidade falharam) e a
    // feature flag está ligada, gera uma segunda tentativa com prompt
    // reforçado e fica com o melhor (mais checks passing). Limitado a 1
    // retry pra não estourar orçamento.
    let retryReason: 'not_attempted' | 'disabled' | 'no_hints' | 'retry_picked' | 'retry_rejected' =
      'not_attempted'
    if (acceptance?.shouldRetry) {
      if (process.env.TRY_ON_RETRY_ENABLED !== 'true') {
        retryReason = 'disabled'
      } else if (acceptance.retryHints.length === 0) {
        retryReason = 'no_hints'
      } else {
        const reinforced = composeRetryPrompt(composedPrompt.prompt, acceptance.retryHints)
        logger.info('Try-on retry: regenerando com prompt reforçado', {
          hints: acceptance.retryHints.length,
        })
        try {
          const retryProviderInput = buildTryOnProviderInput({
            customerPhoto: input.customerPhoto,
            productImage: garmentUrl,
            background: providerBackground,
            googleModelOverride,
            promptOverride: reinforced,
            promptVariantId: `${composedPrompt.promptVariantId}+retry`,
          })
          const retryResult = await runTier(tierChosen, {
            provider: retryProviderInput,
            variables,
          })
          const retryAcceptance = await runAcceptancePostGen({
            customerPhotoDataUrl: input.customerPhoto,
            resultUrl: retryResult.resultUrl,
            garmentUrl,
            safetyRatings: retryResult.safetyRatings,
            garmentOcrText: bestOfN.garmentText,
          })
          const originalScore = acceptance.checks.filter((c) => c.checked && c.pass).length
          const retryScore =
            retryAcceptance?.checks.filter((c) => c.checked && c.pass).length ?? 0
          if (retryAcceptance && retryScore > originalScore) {
            result = retryResult
            tierEffective = retryResult.tier
            acceptance = retryAcceptance
            retryReason = 'retry_picked'
          } else {
            retryReason = 'retry_rejected'
          }
          logger.info('Try-on retry: resultado', {
            retryReason,
            originalScore,
            retryScore,
          })
        } catch (err) {
          logger.warn('Try-on retry: falhou — mantendo geração original', {
            message: err instanceof Error ? err.message : String(err),
          })
          retryReason = 'retry_rejected'
        }
      }
    }

    await supabase.from('try_on_uses').insert({
      loja_id: loja.id,
      peca_id: peca.id,
      ip_hash: ipHash,
      session_id: input.sessionId ?? null,
      success: true,
      provider: result.provider,
      provider_request_id: result.requestId,
      duration_ms: result.durationMs,
    })

    // Base de aprendizado de qualidade (ADR 0009) — best-effort, nunca quebra o fluxo.
    const generationId = await recordGeneration({
      lojaId: loja.id,
      pecaId: peca.id,
      sessionId: input.sessionId ?? null,
      ipHash,
      aiImageModel,
      status: 'success',
      provider: result.provider,
      providerRequestId: result.requestId,
      modelResolved: result.modelUsed ?? googleModelOverride,
      finalPrompt: result.finalPrompt ?? null,
      generationParams: mergeAcceptanceIntoParams(
        result.generationParams ?? null,
        acceptance,
        retryReason,
      ),
      resultBucket: result.resultBucket ?? null,
      resultPath: result.resultPath ?? null,
      durationMs: result.durationMs,
      customerPhotoDataUrl: input.customerPhoto,
      productImagePath: garmentStoragePath,
      gateVerdict,
      gateReason,
      gateSignals: gateSignalsForLog,
      tierChosen,
      tierEffective,
    })

    logger.info('Try-on bem-sucedido', {
      provider: result.provider,
      tier_chosen: tierChosen,
      tier_effective: tierEffective,
      duration_ms: result.durationMs,
      total_ms: Date.now() - t0,
    })

    return {
      ok: true,
      resultUrl: result.resultUrl,
      expiresAt: result.expiresAt,
      provider: result.provider,
      generationId,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    await supabase.from('try_on_uses').insert({
      loja_id: loja.id,
      peca_id: peca.id,
      ip_hash: ipHash,
      session_id: input.sessionId ?? null,
      success: false,
      error_code: 'provider_failed',
      duration_ms: Date.now() - t0,
    })

    await recordGeneration({
      lojaId: loja.id,
      pecaId: peca.id,
      sessionId: input.sessionId ?? null,
      ipHash,
      aiImageModel,
      status: 'error',
      modelResolved: googleModelOverride,
      errorCode: 'provider_failed',
      durationMs: Date.now() - t0,
      customerPhotoDataUrl: input.customerPhoto,
      productImagePath: garmentStoragePath,
      gateVerdict,
      gateReason,
      gateSignals: gateSignalsForLog,
      tierChosen,
      tierEffective: null,
    })

    logger.warn('Try-on falhou', { message })
    return { ok: false, error: { kind: 'provider_failed', message } }
  }
}

// ─── Acceptance helpers ─────────────────────────────────────────────────

/** Decodifica `data:<mime>;base64,...` em Buffer. Retorna null se inválido. */
function bufferFromDataUrl(dataUrl: string): Buffer | null {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl)
  if (!match) return null
  try {
    return Buffer.from(match[2]!, 'base64')
  } catch {
    return null
  }
}

/** Extrai o mime de `data:<mime>;base64,...`. Retorna null se inválido. */
function mimeFromDataUrl(dataUrl: string): string | null {
  const match = /^data:([^;]+);base64,/s.exec(dataUrl)
  return match?.[1] ?? null
}

/**
 * Faz fetch server-side de uma URL de imagem com validação SSRF.
 *
 * Só faz fetch se a URL pertence ao allowlist de domínios confiáveis
 * (providers de IA + Supabase Storage). URLs fora do allowlist são
 * silenciosamente ignoradas (retornam null) sem fazer nenhuma request.
 */
async function fetchAsBuffer(url: string): Promise<Buffer | null> {
  // Defesa contra SSRF: nunca faça fetch de URLs externas sem validar domínio.
  if (!isAllowedResultUrl(url)) {
    logger.warn('fetchAsBuffer: URL fora do allowlist bloqueada', {
      host: (() => { try { return new URL(url).hostname } catch { return 'invalid' } })(),
    })
    return null
  }
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const arr = await res.arrayBuffer()
    return Buffer.from(arr)
  } catch {
    return null
  }
}

/**
 * Roda os acceptance checks pós-geração em modo log-only.
 * Retorna null em qualquer erro — NUNCA quebra o fluxo principal.
 *
 * Fetcha resultUrl + garmentUrl em paralelo. Se algum falhar, o check que
 * depende dele degrada para `checked: false` (não bloqueia).
 */
async function runAcceptancePostGen(args: {
  customerPhotoDataUrl: string
  resultUrl: string
  garmentUrl: string
  safetyRatings?: SafetyRating[]
  garmentOcrText?: string
}): Promise<AcceptanceResult | null> {
  try {
    const customerBuf = bufferFromDataUrl(args.customerPhotoDataUrl)
    const [resultBuf, garmentBuf] = await Promise.all([
      fetchAsBuffer(args.resultUrl),
      fetchAsBuffer(args.garmentUrl),
    ])
    if (!customerBuf || !resultBuf) return null
    return await runAcceptanceChecks({
      customerImageBuffer: customerBuf,
      garmentImageBuffer: garmentBuf ?? Buffer.alloc(0),
      resultImageBuffer: resultBuf,
      safetyRatings: args.safetyRatings,
      garmentOcrText: args.garmentOcrText,
    })
  } catch (err) {
    logger.warn('Try-on acceptance: ignorando exceção', {
      message: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/** Encaixa o resultado do acceptance dentro de `generation_params` (JSONB). */
function mergeAcceptanceIntoParams(
  existing: Record<string, unknown> | null,
  acceptance: AcceptanceResult | null,
  retryReason?: string,
): Record<string, unknown> | null {
  if (!acceptance) {
    return retryReason ? { ...(existing ?? {}), retry: { reason: retryReason } } : existing
  }
  return {
    ...(existing ?? {}),
    acceptance: {
      pass: acceptance.pass,
      shouldRetry: acceptance.shouldRetry,
      retryHints: acceptance.retryHints,
      checks: acceptance.checks,
    },
    ...(retryReason ? { retry: { reason: retryReason } } : {}),
  }
}
