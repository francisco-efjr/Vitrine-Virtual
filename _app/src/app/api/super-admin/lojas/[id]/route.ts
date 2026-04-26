import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { handleRoute } from '@/lib/api/response'
import { requireSuperAdmin } from '@/server/auth/session'
import { setLojaAtiva } from '@/server/lojas/list'

const patchSchema = z.object({ ativa: z.boolean() })

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    await requireSuperAdmin()
    const body = patchSchema.parse(await req.json())
    await setLojaAtiva(params.id, body.ativa)
    return { id: params.id, ativa: body.ativa }
  })
}
