import { z } from 'zod'
import { IMAGE_MAX_UPLOAD_BYTES } from '@/lib/images/upload'

export const pecaStatusSchema = z.enum(['disponivel', 'vendida'])
export type PecaStatus = z.infer<typeof pecaStatusSchema>

export const categoriaIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Categoria inválida')

export const pecaCreateSchema = z.object({
  nome: z.string().trim().min(1, 'Nome obrigatório').max(100, 'Máximo 100 caracteres'),
  preco_centavos: z
    .number()
    .int('Preço em centavos deve ser inteiro')
    .min(0, 'Preço não pode ser negativo')
    .max(100_000_000, 'Preço inválido')
    .nullable()
    .optional(),
  tamanho: z.string().trim().max(60).nullable().optional(),
  categoria_id: categoriaIdSchema.nullable().optional(),
  status: pecaStatusSchema.default('disponivel'),
})
export type PecaCreateInput = z.infer<typeof pecaCreateSchema>

export const pecaUpdateSchema = pecaCreateSchema.partial()
export type PecaUpdateInput = z.infer<typeof pecaUpdateSchema>

/**
 * Converte preço em string ("89,90" ou "89.90") para centavos.
 * Aceita tanto vírgula (BR) quanto ponto.
 * Retorna null se string vazia.
 */
export function precoStringToCentavos(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed
  const num = Number(normalized)
  if (!Number.isFinite(num) || num < 0) {
    throw new Error('Preço inválido')
  }
  return Math.round(num * 100)
}

export function centavosToPrecoString(centavos: number | null | undefined): string {
  if (centavos == null) return ''
  return (centavos / 100).toFixed(2).replace('.', ',')
}

/** Formata preço em centavos para exibição (R$ 89,90). */
export function formatPreco(centavos: number | null | undefined): string {
  if (centavos == null) return ''
  const reais = centavos / 100
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reais)
}

// Foto upload
export const fotoUploadSchema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  size: z.number().int().min(1).max(IMAGE_MAX_UPLOAD_BYTES, 'Foto maior que 10 MB'),
})
export type FotoUploadInput = z.infer<typeof fotoUploadSchema>

export const fotoBase64DataUrlSchema = z.string().regex(
  /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/,
  'data_url inválido',
)

export const fotoBase64UploadSchema = fotoUploadSchema.extend({
  action: z.literal('upload_base64'),
  data_url: fotoBase64DataUrlSchema,
  ordem: z.number().int().min(0),
})
export type FotoBase64UploadInput = z.infer<typeof fotoBase64UploadSchema>
