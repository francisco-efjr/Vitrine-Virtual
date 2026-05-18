import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { handleRoute } from '@/lib/api/response'
import { requireSuperAdmin } from '@/server/auth/session'
import { setLojaAiModel, setLojaAtiva } from '@/server/lojas/update'
import { aiImageModelSchema } from '@/lib/validators/loja'

const patchSchema = z
  .object({
    ativa: z.boolean().optional(),
    ai_image_model: aiImageModelSchema.optional(),
  })
  .refine((b) => b.ativa !== undefined || b.ai_image_model !== undefined, {
    message: 'Nada para atualizar',
  })

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    await requireSuperAdmin()
    const body = patchSchema.parse(await req.json())
    if (typeof body.ativa === 'boolean') {
      await setLojaAtiva(params.id, body.ativa)
    }
    if (body.ai_image_model) {
      await setLojaAiModel(params.id, body.ai_image_model)
    }
    return { id: params.id, ...body }
  })
}
