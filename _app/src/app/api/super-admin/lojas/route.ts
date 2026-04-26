import type { NextRequest } from 'next/server'
import { handleRoute } from '@/lib/api/response'
import { requireSuperAdmin } from '@/server/auth/session'
import { createLojaWithInvite } from '@/server/lojas/create'
import { listLojasWithStats } from '@/server/lojas/list'
import { lojaCreateSchema } from '@/lib/validators/loja'

export const dynamic = 'force-dynamic'

export async function GET() {
  return handleRoute(async () => {
    await requireSuperAdmin()
    const lojas = await listLojasWithStats()
    return lojas
  })
}

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    await requireSuperAdmin()
    const body = await req.json()
    const input = lojaCreateSchema.parse(body)
    return await createLojaWithInvite(input)
  })
}
