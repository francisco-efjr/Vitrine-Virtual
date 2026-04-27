import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { handleRoute } from '@/lib/api/response'
import { requireLojista } from '@/server/auth/session'
import { fotoUploadSchema } from '@/lib/validators/peca'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { getOwnPeca } from '@/server/pecas/crud'
import {
  confirmFotoUploaded,
  createSignedUploadUrl,
  deleteFoto,
  setFotoPrincipal,
} from '@/server/pecas/fotos'

/**
 * Lista fotos de uma peça com signed URLs (válidas por 1 hora).
 * Usado pelo admin panel para exibir thumbnails no modal de edição.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const session = await requireLojista()
    const supabase = createServerSupabase()

    // Valida que a peça pertence à loja (getOwnPeca lança 404 se não pertencer)
    const peca = await getOwnPeca(session.loja.id, params.id)

    const { data: fotos, error } = await supabase
      .from('pecas_fotos')
      .select('id, storage_path, ordem')
      .eq('peca_id', params.id)
      .order('ordem', { ascending: true })

    if (error) throw error

    // Gera signed URLs (1h) para cada foto — o dono pode ler via RLS
    const fotosComUrl = await Promise.all(
      (fotos ?? []).map(async (foto) => {
        const { data: signed } = await supabase.storage
          .from('pecas-fotos')
          .createSignedUrl(foto.storage_path, 3600)
        return {
          id: foto.id,
          storage_path: foto.storage_path,
          ordem: foto.ordem,
          signed_url: signed?