import 'server-only'
import { z } from 'zod'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  IMAGE_MAX_UPLOAD_BYTES,
  validateImageUploadMeta,
} from '@/lib/images/upload'
import { logger } from '@/lib/logger'
import { LojaError } from './errors'
import type { LojaRow } from '@/types/database'

/**
 * Upload de assets da loja (logo + fundo da Cabine + foto editorial do hero)
 * para o bucket público `lojas-logos`. O path é determinístico:
 * `{loja_id}/{kind}-{uuid}.{ext}`, o que casa com as policies do bucket
 * (apenas o dono insere/remove, leitura é pública).
 *
 * Pós-upload, o storage_path é gravado em `lojas.logo_storage_path`,
 * `lojas.provador_fundo_storage_path` ou `lojas.hero_image_storage_path`.
 * O blob anterior (se houver) é removido em background — falha aqui só vira
 * warning, nunca quebra o fluxo do usuário.
 */

export const LOJA_ASSET_KINDS = ['logo', 'provador_fundo', 'hero_image'] as const
export type LojaAssetKind = (typeof LOJA_ASSET_KINDS)[number]

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const

const EXT_MAP: Record<(typeof ALLOWED_MIME)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export const lojaAssetUploadSchema = z.object({
  kind: z.enum(LOJA_ASSET_KINDS),
  filename: z.string().min(1).max(200),
  contentType: z.enum(ALLOWED_MIME),
  size: z
    .number()
    .int()
    .min(1)
    .max(IMAGE_MAX_UPLOAD_BYTES, 'Imagem maior que 10 MB'),
  data_url: z
    .string()
    .regex(
      /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/,
      'data_url inválido',
    ),
})
export type LojaAssetUploadInput = z.infer<typeof lojaAssetUploadSchema>

const BUCKET = 'lojas-logos'

interface UploadResult {
  storage_path: string
  public_url: string
  loja: LojaRow
}

export async function uploadLojaAsset(
  lojaId: string,
  input: LojaAssetUploadInput,
): Promise<UploadResult> {
  const data = lojaAssetUploadSchema.parse(input)
  const validation = validateImageUploadMeta({
    filename: data.filename,
    contentType: data.contentType,
    size: data.size,
  })
  if (!validation.ok) {
    throw new LojaError(validation.message, 'INVALID_ASSET_UPLOAD', 400)
  }

  const buffer = dataUrlToBuffer(data.data_url, data.contentType)
  if (buffer.byteLength > IMAGE_MAX_UPLOAD_BYTES) {
    throw new LojaError('Falha ao processar imagem', 'BAD_IMAGE_BUFFER', 400)
  }

  const ext = EXT_MAP[data.contentType]
  const fileId = crypto.randomUUID()
  const storagePath = `${lojaId}/${data.kind}-${fileId}.${ext}`

  // Usamos service client para evitar 403 de RLS no Storage quando o
  // usuário fez upload via Server Component (cookies podem ter limites
  // no roundtrip de SSR). A authoridade da loja já foi checada por
  // `requireLojista()` na rota.
  const service = createServiceClient()

  const { error: uploadError } = await service.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: data.contentType,
      upsert: false,
    })

  if (uploadError) {
    logger.error('Erro ao subir asset da loja', {
      kind: data.kind,
      code: uploadError.message,
    })
    throw new LojaError('Falha ao enviar imagem', 'UPLOAD_FAIL', 500)
  }

  // Atualiza o caminho na tabela `lojas` e (se for fundo) marca o tipo
  // como personalizado para que a tile já reflita visualmente o estado.
  const supabase = createServerSupabase()
  const KIND_TO_COLUMN: Record<LojaAssetKind, keyof LojaRow> = {
    logo: 'logo_storage_path',
    provador_fundo: 'provador_fundo_storage_path',
    hero_image: 'hero_image_storage_path',
  }
  const column = KIND_TO_COLUMN[data.kind]

  const update: Partial<LojaRow> = { [column]: storagePath } as Partial<LojaRow>
  if (data.kind === 'provador_fundo') {
    update.provador_fundo_tipo = 'personalizado'
  }

  const { data: previousLoja } = await supabase
    .from('lojas')
    .select(column)
    .eq('id', lojaId)
    .maybeSingle<{ [k: string]: string | null }>()

  const { data: updatedLoja, error: updateError } = await supabase
    .from('lojas')
    .update(update)
    .eq('id', lojaId)
    .select('*')
    .single()

  if (updateError || !updatedLoja) {
    logger.error('Erro ao salvar asset na loja', {
      kind: data.kind,
      code: updateError?.message,
    })
    // Tenta limpar o blob recém-enviado para não acumular órfãos.
    await service.storage
      .from(BUCKET)
      .remove([storagePath])
      .catch(() => {/* noop */})
    throw new LojaError('Falha ao salvar referência da imagem', 'SAVE_FAIL', 500)
  }

  const previousPath = previousLoja?.[column] ?? null
  if (previousPath && previousPath !== storagePath) {
    await service.storage
      .from(BUCKET)
      .remove([previousPath])
      .catch((e) =>
        logger.warn('Falha ao limpar asset antigo', { code: String(e) }),
      )
  }

  return {
    storage_path: storagePath,
    public_url: buildPublicUrl(storagePath),
    loja: updatedLoja,
  }
}

/**
 * Limpa o fundo personalizado: remove o blob do storage e zera a coluna,
 * voltando o tipo do fundo para `branco`. Usado quando a lojista clica
 * em "Remover" na tile da Cabine.
 */
export async function clearProvadorFundo(lojaId: string): Promise<LojaRow> {
  const supabase = createServerSupabase()
  const service = createServiceClient()

  const { data: prev } = await supabase
    .from('lojas')
    .select('provador_fundo_storage_path')
    .eq('id', lojaId)
    .maybeSingle()

  const { data: updated, error: updateError } = await supabase
    .from('lojas')
    .update({
      provador_fundo_storage_path: null,
      provador_fundo_tipo: 'branco',
    })
    .eq('id', lojaId)
    .select('*')
    .single()

  if (updateError || !updated) {
    logger.error('Erro ao remover fundo da Cabine', {
      code: updateError?.message,
    })
    throw new LojaError('Falha ao remover fundo', 'CLEAR_FAIL', 500)
  }

  if (prev?.provador_fundo_storage_path) {
    await service.storage
      .from(BUCKET)
      .remove([prev.provador_fundo_storage_path])
      .catch((e) =>
        logger.warn('Falha ao remover blob do fundo', { code: String(e) }),
      )
  }

  return updated
}

export async function removeLojaLogo(lojaId: string): Promise<LojaRow> {
  const supabase = createServerSupabase()
  const service = createServiceClient()

  const { data: prev } = await supabase
    .from('lojas')
    .select('logo_storage_path')
    .eq('id', lojaId)
    .maybeSingle()

  const { data: updated, error: updateError } = await supabase
    .from('lojas')
    .update({ logo_storage_path: null })
    .eq('id', lojaId)
    .select('*')
    .single()

  if (updateError || !updated) {
    logger.error('Erro ao remover logo da loja', {
      code: updateError?.message,
    })
    throw new LojaError('Falha ao remover logo', 'CLEAR_LOGO_FAIL', 500)
  }

  if (prev?.logo_storage_path) {
    await service.storage
      .from(BUCKET)
      .remove([prev.logo_storage_path])
      .catch((e) =>
        logger.warn('Falha ao remover blob da logo', { code: String(e) }),
      )
  }

  return updated
}

/**
 * Limpa a foto editorial do hero: remove o blob do storage e zera a coluna.
 * Usado quando a lojista clica "Remover" no card de personalização do hero.
 */
export async function removeLojaHeroImage(lojaId: string): Promise<LojaRow> {
  const supabase = createServerSupabase()
  const service = createServiceClient()

  const { data: prev } = await supabase
    .from('lojas')
    .select('hero_image_storage_path')
    .eq('id', lojaId)
    .maybeSingle()

  const { data: updated, error: updateError } = await supabase
    .from('lojas')
    .update({ hero_image_storage_path: null })
    .eq('id', lojaId)
    .select('*')
    .single()

  if (updateError || !updated) {
    logger.error('Erro ao remover hero image da loja', {
      code: updateError?.message,
    })
    throw new LojaError('Falha ao remover imagem', 'CLEAR_HERO_FAIL', 500)
  }

  if (prev?.hero_image_storage_path) {
    await service.storage
      .from(BUCKET)
      .remove([prev.hero_image_storage_path])
      .catch((e) =>
        logger.warn('Falha ao remover blob da hero image', { code: String(e) }),
      )
  }

  return updated
}

export function buildLojaAssetPublicUrl(storagePath: string | null): string | null {
  if (!storagePath) return null
  return buildPublicUrl(storagePath)
}

function buildPublicUrl(storagePath: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')
  return `${base}/storage/v1/object/public/${BUCKET}/${storagePath}`
}

function dataUrlToBuffer(
  dataUrl: string,
  contentType: (typeof ALLOWED_MIME)[number],
): Buffer {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/)
  if (!match) {
    throw new LojaError('data_url inválido', 'INVALID_DATA_URL', 400)
  }
  if (match[1] !== contentType) {
    throw new LojaError('MIME não confere com o payload', 'MIME_MISMATCH', 400)
  }
  const base64 = match[2]
  if (!base64) {
    throw new LojaError('data_url inválido', 'INVALID_DATA_URL', 400)
  }
  try {
    return Buffer.from(base64, 'base64')
  } catch {
    throw new LojaError('Falha ao decodificar imagem', 'BAD_BASE64', 400)
  }
}
