import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { handleRoute } from '@/lib/api/response'
import { fotoBase64UploadSchema, fotoUploadSchema } from '@/lib/validators/peca'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { requireLojista } from '@/server/auth/session'
import { getOwnPeca } from '@/server/pecas/crud'
import {
  confirmFotoUploaded,
  createSignedUploadUrl,
  deleteFoto,
  setFotoPrincipal,
  uploadFotoBase64,
} from '@/server/pecas/fotos'

const postBodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create_signed_upload'),
    filename: fotoUploadSchema.shape.filename,
    contentType: fotoUploadSchema.shape.contentType,
    size: fotoUploadSchema.shape.size,
  }),
  z.object({
    action: z.literal('confirm_upload'),
    storage_path: z.string().min(1),
    ordem: z.number().int().min(0),
  }),
  fotoBase64UploadSchema,
  z.object({
    action: z.literal('set_principal'),
    foto_id: z.string().uuid('foto_id inválido'),
  }),
])

/**
 * Lista fotos de uma peça com signed URLs (válidas por 1 hora).
 * Usado pelo admin panel para exibir thumbnails no modal de edição.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const session = await requireLojista()
    const supabase = createServerSupabase()
    const peca = await getOwnPeca(session.loja.id, params.id)

    const { data: fotos, error } = await supabase
      .from('pecas_fotos')
      .select('id, storage_path, ordem')
      .eq('peca_id', params.id)
      .order('ordem', { ascending: true })

    if (error) throw error

    return await Promise.all(
      (fotos ?? []).map(async (foto) => {
        const { data: signed } = await supabase.storage
          .from('pecas-fotos')
          .createSignedUrl(foto.storage_path, 3600)

        return {
          id: foto.id,
          storage_path: foto.storage_path,
          ordem: foto.ordem,
          signed_url: signed?.signedUrl ?? null,
          is_principal: peca.foto_principal_id === foto.id,
        }
      }),
    )
  })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const session = await requireLojista()
    const body = postBodySchema.parse(await req.json())

    switch (body.action) {
      case 'create_signed_upload':
        return await createSignedUploadUrl(session.loja.id, params.id, {
          filename: body.filename,
          contentType: body.contentType,
          size: body.size,
        })
      case 'confirm_upload':
        return await confirmFotoUploaded(session.loja.id, params.id, body.storage_path, body.ordem)
      case 'upload_base64':
        return await uploadFotoBase64(session.loja.id, params.id, body)
      case 'set_principal':
        await setFotoPrincipal(session.loja.id, params.id, body.foto_id)
        return { id: body.foto_id, principal: true }
    }
  })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const session = await requireLojista()
    const fotoId = z.string().uuid('foto_id inválido').parse(req.nextUrl.searchParams.get('foto_id'))
    await deleteFoto(session.loja.id, params.id, fotoId)
    return { id: fotoId, deleted: true }
  })
}
