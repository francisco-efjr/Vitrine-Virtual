import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { handleRoute } from '@/lib/api/response'
import { requireSuperAdmin } from '@/server/auth/session'
import {
  getDefaultAiImageModel,
  getTryOnBudget,
  isTryOnEnabled,
  setDefaultAiImageModel,
  setTryOnBudget,
  setTryOnEnabled,
} from '@/lib/try-on/kill-switch'
import { aiImageModelSchema } from '@/lib/validators/loja'

const patchSchema = z.object({
  try_on_enabled: z.boolean().optional(),
  try_on_monthly_budget_usd: z.number().positive().optional(),
  default_ai_image_model: aiImageModelSchema.optional(),
})

export const dynamic = 'force-dynamic'

export async function GET() {
  return handleRoute(async () => {
    await requireSuperAdmin()
    const [enabled, budget, defaultModel] = await Promise.all([
      isTryOnEnabled(),
      getTryOnBudget(),
      getDefaultAiImageModel(),
    ])
    return { try_on_enabled: enabled, ...budget, default_ai_image_model: defaultModel }
  })
}

export async function PATCH(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireSuperAdmin()
    const body = patchSchema.parse(await req.json())
    if (typeof body.try_on_enabled === 'boolean') {
      await setTryOnEnabled(body.try_on_enabled, session.user.id)
    }
    if (typeof body.try_on_monthly_budget_usd === 'number') {
      await setTryOnBudget(body.try_on_monthly_budget_usd, session.user.id)
    }
    if (body.default_ai_image_model) {
      await setDefaultAiImageModel(body.default_ai_image_model, session.user.id)
    }
    return { ok: true }
  })
}
