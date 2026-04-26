import type { NextRequest } from 'next/server'
import { handleRoute } from '@/lib/api/response'
import { requireLojista } from '@/server/auth/session'
import { updateOwnLoja } from '@/server/lojas/update'

export const dynamic = 'force-dynamic'

export async function GET() {
  return handleRoute(async () => {
    const session = await requireLojista()
    return session.loja
  })
}

export async function PATCH(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireLojista()
    const body = await req.json()
    return await updateOwnLoja(session.loja.id, body)
  })
}
