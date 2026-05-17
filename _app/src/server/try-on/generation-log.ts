import 'server-only'
import { logger } from '@/lib/logger'
import { createServiceClient } from '@/lib/supabase/service'
import type { AiImageModel, TryOnGenerationRow } from '@/types/database'

const CUSTOMER_PHOTO_BUCKET = 'try-on-customer-photos'

/**
 * Base de aprendizado de qualidade da Cabine (ADR 0009, substitui 0006).
 *
 * Persistimos metadados de cada geração (modelo, prompt, parâmetros, status),
 * a foto enviada pelo cliente e o resultado — para análise futura, comparação
 * entre modelos e melhoria de prompt.
 *
 * IMPORTANTE: nada aqui pode quebrar o fluxo do provador. Toda gravação é
 * best-effort com try/catch — uma falha de log NÃO impede o cliente de ver o
 * resultado. Acesso aos dados só via service role / super-admin (RLS).
 */

interface RecordGenerationInput {
  lojaId: string
  pecaId: string | null
  sessionId?: string | null
  ipHash?: string | null
  aiImageModel: AiImageModel | null
  status: 'success' | 'error' | 'fallback'
  provider?: 'fashn' | 'replicate' | 'google' | 'openai' | null
  providerRequestId?: string | null
  modelResolved?: string | null
  finalPrompt?: string | null
  generationParams?: Record<string, unknown> | null
  resultBucket?: string | null
  resultPath?: string | null
  errorCode?: string | null
  durationMs?: number | null
  /** data URL `data:<mime>;base64,<...>` — decodificado e salvo no bucket privado. */
  customerPhotoDataUrl?: string | null
  /** caminho da foto da peça no bucket pecas-fotos, quando disponível. */
  productImagePath?: string | null
}

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl)
  if (!match) return null
  const mime = match[1] ?? 'image/webp'
  try {
    return { mime, buffer: Buffer.from(match[2]!, 'base64') }
  } catch {
    return null
  }
}

function extFromMime(mime: string): string {
  if (mime.includes('png')) return 'png'
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  return 'webp'
}

/**
 * Registra uma geração. Retorna o id criado (ou null se o log falhou —
 * nesse caso o feedback simplesmente não fica disponível, sem impacto no fluxo).
 */
export async function recordGeneration(input: RecordGenerationInput): Promise<string | null> {
  try {
    const supabase = createServiceClient()

    let customerPhotoPath: string | null = null
    if (input.customerPhotoDataUrl) {
      const parsed = parseDataUrl(input.customerPhotoDataUrl)
      if (parsed) {
        const path = `${input.lojaId}/${crypto.randomUUID()}.${extFromMime(parsed.mime)}`
        const { error: upErr } = await supabase.storage
          .from(CUSTOMER_PHOTO_BUCKET)
          .upload(path, parsed.buffer, { contentType: parsed.mime, upsert: false })
        if (upErr) {
          logger.warn('Generation log: falha ao salvar foto do cliente', {
            code: upErr.message,
          })
        } else {
          customerPhotoPath = path
        }
      }
    }

    const row: Partial<TryOnGenerationRow> = {
      loja_id: input.lojaId,
      peca_id: input.pecaId,
      session_id: input.sessionId ?? null,
      ip_hash: input.ipHash ?? null,
      ai_image_model: input.aiImageModel,
      model_resolved: input.modelResolved ?? null,
      provider: input.provider ?? null,
      provider_request_id: input.providerRequestId ?? null,
      final_prompt: input.finalPrompt ?? null,
      generation_params: (input.generationParams ?? null) as TryOnGenerationRow['generation_params'],
      result_bucket: input.resultBucket ?? null,
      result_path: input.resultPath ?? null,
      status: input.status,
      error_code: input.errorCode ?? null,
      duration_ms: input.durationMs ?? null,
      customer_photo_path: customerPhotoPath,
      product_image_path: input.productImagePath ?? null,
    }

    const { data, error } = await supabase
      .from('try_on_generations')
      .insert(row)
      .select('id')
      .single()

    if (error || !data) {
      logger.warn('Generation log: falha ao inserir registro', { code: error?.message })
      return null
    }
    return data.id
  } catch (err) {
    logger.warn('Generation log: exceção ignorada', {
      message: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * Anexa o feedback opcional do cliente a uma geração existente.
 * Idempotente o suficiente para o MVP: sobrescreve se reenviado.
 */
export async function recordGenerationFeedback(
  generationId: string,
  positive: boolean,
  comment?: string | null,
): Promise<boolean> {
  try {
    const supabase = createServiceClient()
    const { error } = await supabase
      .from('try_on_generations')
      .update({
        feedback_positivo: positive,
        feedback_comentario: comment?.trim() ? comment.trim().slice(0, 1000) : null,
        feedback_at: new Date().toISOString(),
      })
      .eq('id', generationId)
    if (error) {
      logger.warn('Generation feedback: falha ao atualizar', { code: error.message })
      return false
    }
    return true
  } catch (err) {
    logger.warn('Generation feedback: exceção ignorada', {
      message: err instanceof Error ? err.message : String(err),
    })
    return false
  }
}
