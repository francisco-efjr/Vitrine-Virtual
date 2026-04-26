import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'
import { generateTryOn } from '@/lib/try-on/orchestrator'
import { checkTryOnRateLimit } from '@/lib/try-on/rate-limit'
import { verifyTurnstileToken } from '@/lib/try-on/turnstile'
import { isTryOnEnabled } from '@/lib/try-on/kill-switch'
import { hashIp } from '@/lib/security/ip-hash'
import { checkLojaQuota } from './quota'
import type { TryOnProviderInput } from '@/lib/try-on/types'

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
  provider: 'fashn' | 'replicate'
}

export type TryOnResult = TryOnSuccess | { ok: false; error: TryOnError }

export interface RunTryOnInput {
  pecaId: string
  turnstileToken: string
  modelImage: string
  ip: string
  sessionId?: string
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

  // CAMADA 4: kill switch global
  if (!(await isTryOnEnabled())) {
    return { ok: false, error: { kind: 'kill_switch_off' } }
  }

  // CAMADA 1: Turnstile
  const turnstileOk = await verifyTurnstileToken(input.turnstileToken, input.ip)
  if (!turnstileOk) {
    return { ok: false, error: { kind: 'turnstile_failed' } }
  }

  // CAMADA 2: rate limit por IP
  const rl = await checkTryOnRateLimit(ipHash)
  if (!rl.ok) {
    return {
      ok: false,
      error: { kind: 'rate_limit', reason: rl.reason!, resetAt: rl.reset },
    }
  }

  // Carrega peça + loja para validar e pegar foto principal
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
    .select('id, ativa, cota_try_on_mensal')
    .eq('id', peca.loja_id)
    .single()
  if (!loja?.ativa) return { ok: false, error: { kind: 'peca_unavailable' } }

  // CAMADA 3: cota mensal por loja
  const quota = await checkLojaQuota(loja.id, loja.cota_try_on_mensal)
  if (!quota.ok) {
    return {
      ok: false,
      error: { kind: 'quota_exceeded', used: quota.used, limit: quota.limit },
    }
  }

  // Pega URL pública da foto principal da peça
  let garmentUrl = ''
  if (peca.foto_principal_id) {
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

  const providerInput: TryOnProviderInput = {
    modelImage: input.modelImage,
    garmentImage: garmentUrl,
  }

  try {
    const result = await generateTryOn(providerInput)

    // Log SANITIZADO — sem foto, sem IP cru, sem URL do resultado.
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
