import type { NextRequest } from 'next/server'
import { handleRoute } from '@/lib/api/response'
import { requireLojista } from '@/server/auth/session'
import {
  deletePeca,
  getOwnPeca,
  markPecaVendida,
  reabrirPeca,
  updatePeca,
} from '@/server/pecas/crud'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const session = await requireLojista()
    return await getOwnPeca(session.loja.id, params.id)
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const session = await requireLojista()
    const body = await req.json()
    if (body && body.action === 'marcar_vendida') {
      return await markPecaVendida(session.loja.id, params.id)
    }
    if (body && body.action === 'reabrir') {
      return await reabrirPeca(session.loja.id, params.id)
    }
    return await updatePeca(session.loja.id, params.id, body)
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const session = await requireLojista()
    await deletePeca(session.loja.id, params.id)
    return { id: params.id, deleted: true }
  })
}
