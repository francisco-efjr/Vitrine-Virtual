import type { NextRequest } from 'next/server'
import { handleRoute } from '@/lib/api/response'
import { requireLojista } from '@/server/auth/session'
import { createPeca, listOwnPecas } from '@/server/pecas/crud'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireLojista()
    const url = new URL(req.url)
    return await listOwnPecas(session.loja.id, {
      somenteDisponiveis: url.searchParams.get('somente_disponiveis') === 'true',
      busca: url.searchParams.get('busca') ?? undefined,
      ordem: (url.searchParams.get('ordem') as 'recentes' | 'antigas' | null) ?? 'recentes',
    })
  })
}

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireLojista()
    const body = await req.json()
    return await createPeca(session.loja.id, body)
  })
}
