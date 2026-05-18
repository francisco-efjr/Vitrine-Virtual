import 'server-only'
import { logger } from '@/lib/logger'
import { createServiceClient } from '@/lib/supabase/service'
import type { ContactChannel } from '@/types/database'

export const CONTACT_CHANNELS = ['instagram', 'tiktok', 'whatsapp'] as const

export function isContactChannel(v: unknown): v is ContactChannel {
  return v === 'instagram' || v === 'tiktok' || v === 'whatsapp'
}

export function deviceTypeFromUA(ua: string | null | undefined): string {
  if (!ua) return 'unknown'
  const s = ua.toLowerCase()
  if (/ipad|tablet|playbook|silk/.test(s)) return 'tablet'
  if (/mobi|iphone|android.*mobile|phone/.test(s)) return 'mobile'
  if (/android/.test(s)) return 'tablet'
  return 'desktop'
}

interface RecordContactClickInput {
  lojaId: string
  channel: ContactChannel
  sessionId?: string | null
  visitorId?: string | null
  userAgent?: string | null
  referrer?: string | null
  ipHash?: string | null
}

/**
 * Registra um clique de contato. Best-effort: nunca lança — uma falha de
 * tracking jamais pode atrapalhar o redirect do cliente. Escrita via service
 * role (RLS só libera leitura para super-admin / dono da loja).
 */
export async function recordContactClick(input: RecordContactClickInput): Promise<boolean> {
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.from('contact_clicks').insert({
      loja_id: input.lojaId,
      channel: input.channel,
      session_id: input.sessionId?.slice(0, 128) ?? null,
      visitor_id: input.visitorId?.slice(0, 128) ?? null,
      user_agent: input.userAgent?.slice(0, 512) ?? null,
      referrer: input.referrer?.slice(0, 1024) ?? null,
      device_type: deviceTypeFromUA(input.userAgent),
      ip_hash: input.ipHash ?? null,
    })
    if (error) {
      logger.warn('Contact click: falha ao inserir', { code: error.message })
      return false
    }
    return true
  } catch (err) {
    logger.warn('Contact click: exceção ignorada', {
      message: err instanceof Error ? err.message : String(err),
    })
    return false
  }
}

export interface ContactClickStats {
  instagram: number
  tiktok: number
  whatsapp: number
}

/**
 * Agrega cliques de contato por loja nos últimos `days` dias.
 * Mesmo padrão de agregação em TS usado por listLojasWithStats.
 */
export async function getContactClickStatsByLoja(
  lojaIds: string[],
  days = 30,
): Promise<Map<string, ContactClickStats>> {
  const map = new Map<string, ContactClickStats>()
  if (lojaIds.length === 0) return map

  const since = new Date()
  since.setUTCDate(since.getUTCDate() - days)

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('contact_clicks')
    .select('loja_id, channel')
    .in('loja_id', lojaIds)
    .gte('created_at', since.toISOString())

  if (error) {
    logger.warn('Contact stats: falha ao agregar', { code: error.message })
    return map
  }

  for (const row of data ?? []) {
    const cur = map.get(row.loja_id) ?? { instagram: 0, tiktok: 0, whatsapp: 0 }
    if (row.channel === 'instagram') cur.instagram++
    else if (row.channel === 'tiktok') cur.tiktok++
    else if (row.channel === 'whatsapp') cur.whatsapp++
    map.set(row.loja_id, cur)
  }
  return map
}
