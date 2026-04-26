import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { handleRoute } from '@/lib/api/response'
import { requireLojista } from '@/server/auth/session'
import { fotoUploadSchema } from '@/lib/validators/peca'
import {
  confirmFotoUploaded,
  createSignedUploadUrl,
  deleteFoto,
  setFotoPrincipal,
} from '@/server/pecas/fotos'

const confirmSchema = z.object({
  storage_path: z.string().min(1),
  ordem: z.number().int().min(0),
})

const principalSchema = z.object({ foto_id: z.string().uuid() })

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const session = await requireLojista()
    const body = await req.json()
    if (body && body.action === 'confirm') {
      const data = confirmSchema.parse(body)
      return await confirmFotoUploaded(session.loja.id, params.id, data.storage_path, data.ordem)
    }
    if (body && body.action === 'set_principal') {
      const data = principalSchema.parse(body)
      await setFotoPrincipal(session.loja.id, params.id, data.foto_id)
      return { ok: true }
    }
    // sign upload
    const meta = fotoUploadSchema.parse(body)
    return await createSignedUploadUrl(session.loja.id, params.id, meta)
  })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const session = await requireLojista()
    const url = new URL(req.url)
    const fotoId = url.searchParams.get('foto_id')
    if (!fotoId) return { ok: false }
    await deleteFoto(session.loja.id, params.id, fotoId)
    return { ok: true }
  })
}
