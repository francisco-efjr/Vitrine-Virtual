import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { handleRoute } from '@/lib/api/response'
import { requireSuperAdmin } from '@/server/auth/session'
import { getTryOnBudget, isTryOnEnabled, setTryOnEnabled } from '@/lib/try-on/kill-switch'

const patchSchema = z.object({
  try_on_enabled: z.boolean().optional(),
  try_on_monthly_budget_usd: z.number().positive().optional(),
})

export const dynamic = 'force-dynamic'

export async function GET() {
  return handleRoute(async () => {
    await requireSuperAdmin()
    const [enabled, budget] = await Promise.all([isTryOnEnabled(), getTryOnBudget()])
    return { try_on_enabled: enabled, ...budget }
  })
}

export async function PATCH(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireSuperAdmin()
    const body = patchSchema.parse(await req.json())
    if (typeof body.try_on_enabled === 'boolean') {
      await setTryOnEnabled(body.try_on_enabled, session.user.id)
    }
    return { ok: true }
  })
}
