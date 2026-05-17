import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { extractClientIp, hashIp } from '@/lib/security/ip-hash'
import { recordContactClick } from '@/server/analytics/contact-clicks'

/**
 * Tracking de intenção de contato.
 *
 * Chamado do front via `navigator.sendBeacon` (fallback `fetch keepalive`)
 * ANTES/DURANTE o redirect para Instagram/TikTok/WhatsApp. Precisa ser:
 *   - rápido (responde 204 sem segurar o cliente)
 *   - resiliente (qualquer erro é engolido — nunca quebra o redirect)
 *
 * Aceita JSON. sendBeacon envia um Blob application/json.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  loja_id: z.string().uuid(),
  channel: z.enum(['instagram', 'tiktok', 'whatsapp']),
  session_id: z.string().max(128).optional(),
  visitor_id: z.string().max(128).optional(),
})

const NO_CONTENT = new NextResponse(null, { status: 204 })

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text()
    if (!raw) return NO_CONTENT
    const parsed = schema.safeParse(JSON.parse(raw))
    if (!parsed.success) return NO_CONTENT

    let ipHash: string | null = null
    try {
      ipHash = hashIp(extractClientIp(req))
    } catch {
      ipHash = null
    }

    await recordContactClick({
      lojaId: parsed.data.loja_id,
      channel: parsed.data.channel,
      sessionId: parsed.data.session_id ?? null,
      visitorId: parsed.data.visitor_id ?? null,
      userAgent: req.headers.get('user-agent'),
      referrer: req.headers.get('referer'),
      ipHash,
    })
  } catch {
    // Engolimos qualquer erro de propósito — tracking nunca quebra o redirect.
  }
  return NO_CONTENT
}
