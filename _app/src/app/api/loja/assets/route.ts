import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { handleRoute } from '@/lib/api/response'
import { requireLojista } from '@/server/auth/session'
import {
  clearProvadorFundo,
  lojaAssetUploadSchema,
  removeLojaHeroImage,
  removeLojaLogo,
  uploadLojaAsset,
} from '@/server/lojas/assets'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireLojista()
    const body = lojaAssetUploadSchema.parse(await req.json())
    return await uploadLojaAsset(session.loja.id, body)
  })
}

const deleteSchema = z.object({
  kind: z.enum(['logo', 'provador_fundo', 'hero_image']),
})

export async function DELETE(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireLojista()
    const kind = deleteSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    ).kind
    if (kind === 'logo') return await removeLojaLogo(session.loja.id)
    if (kind === 'hero_image') return await removeLojaHeroImage(session.loja.id)
    return await clearProvadorFundo(session.loja.id)
  })
}
