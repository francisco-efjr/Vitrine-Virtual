import 'server-only'
import { logger } from '@/lib/logger'
import { hashIp } from '@/lib/security/ip-hash'
import { createServiceClient } from '@/lib/supabase/service'
import { isTryOnEnabled } from '@/lib/try-on/kill-switch'
import { generateTryOn } from '@/lib/try-on/orchestrator'
import { buildTryOnProviderInput } from '@/lib/try-on/payload'
import { checkTryOnRateLimit } from '@/lib/try-on/rate-limit'
import { verifyTurnstileToken } from '@/lib/try-on/turnstile'
import { buildLojaAssetPublicUrl } from '@/server/lojas/assets'
import { checkLojaQuota } from './quota'

export type TryOnError =
  | { kind: 'kill_switch_off' }
  | { kind: 'turnstile_failed' }
  | { kind: 'rate_limit'; reason: 'hour' | 'day' | 'week'; resetAt?: number }
  | { kind: 'quota_exceeded'; used: number; limit: number }
  | { kind: 'peca_unavailable' }
  | { kind: 'provider_failed'; message: string }

export interface TryOnSuccess {
  ok: true
  resultUrl: string
  expiresAt: string
  // Mantemos 'google' por compatibilidade com dados/histórico, mas hoje esse fluxo
  // representa o provider Gemini Nano Banana.
  provider: 'fashn' | 'replicate' | 'google' | 'openai'
}

export type TryOnResult = TryOnSuccess | { ok: false; error: TryOnError }

export interface RunTryOnInput {
  pecaId: string
  turnstileToken: string
  customerPhoto: string
  ip: string
  sessionId?: string
  garmentImageUrlOverride?: string | null
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
    .select('id, ativa, cota_try_on_mensal, provador_fundo_storage_path, provador_fundo_tipo')
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
  if (!garmentUrl && peca.foto_principal_id) {
    const { data: foto } = await supabase
      .from('pecas_fotos')
      .select('storage_path')
      .eq('id', peca.foto_principal_id)
      .single()

    if (foto?.storage_path) {
      const { data: signed } = await supabase.storage
        .from('pecas-fotos')
        .createSignedUrl(foto.storage_path, 60 * 5)
      garmentUrl = signed?.signedUrl ?? ''
    }
  }

  if (!garmentUrl) {
    return { ok: false, error: { kind: 'peca_unavailable' } }
  }

  const provadorFundoUrl =
    loja.provador_fundo_tipo === 'personalizado' && loja.provador_fundo_storage_path
      ? buildLojaAssetPublicUrl(loja.provador_fundo_storage_path)
      : null
  const providerBackground = provadorFundoUrl
    ? {
        mode: 'custom' as const,
        backgroundImage: provadorFundoUrl,
      }
    : {
        mode: 'white' as const,
      }

  logger.info('Try-on: fundo parametrizado da loja', {
    backgroundMode: providerBackground.mode,
    hasCustomBackground: Boolean(provadorFundoUrl),
  })

  const providerInput = buildTryOnProviderInput({
    customerPhoto: input.customerPhoto,
    productImage: garmentUrl,
    background: providerBackground,
  })

  try {
    const result = await generateTryOn(providerInput)

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

    logger.info('Try-on bem-sucedido', {
      provider: result.provider,
      duration_ms: result.durationMs,
      total_ms: Date.now() - t0,
    })

    return {
      ok: true,
      resultUrl: result.resultUrl,
      expiresAt: result.expiresAt,
      provider: result.provider,
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

    logger.warn('Try-on falhou', { message })
    return { ok: false, error: { kind: 'provider_failed', message } }
  }
}
