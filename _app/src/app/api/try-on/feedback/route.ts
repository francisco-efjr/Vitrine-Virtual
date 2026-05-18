import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { fail, ok } from '@/lib/api/response'
import { recordGenerationFeedback } from '@/server/try-on/generation-log'

/**
 * Feedback opcional e minimalista do cliente final sobre o resultado da Cabine.
 * Anônimo (cliente não tem login). Sem PII. Best-effort.
 *
 * Body: { generation_id: uuid, positive: boolean, comment?: string }
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  generation_id: z.string().uuid('generation_id inválido'),
  positive: z.boolean(),
  comment: z.string().trim().max(1000).optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('Payload inválido', 'INVALID_PAYLOAD', 400)
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return fail('Dados inválidos', 'VALIDATION_ERROR', 400)

  const okSaved = await recordGenerationFeedback(
    parsed.data.generation_id,
    parsed.data.positive,
    parsed.data.comment ?? null,
  )

  // Nunca falha de forma ruidosa para o cliente — feedback é opcional.
  return ok({ saved: okSaved })
}
