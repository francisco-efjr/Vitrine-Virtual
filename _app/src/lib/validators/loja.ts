import { z } from 'zod'

/**
 * Validators de loja — usados tanto no front quanto nas API routes/server actions.
 * Cada schema reflete os checks da migration 20260425000001_schema_inicial.sql.
 */

export const slugSchema = z
  .string()
  .min(3, 'Slug deve ter ao menos 3 caracteres')
  .max(60, 'Slug muito longo (máx 60)')
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use apenas letras minúsculas, números e hífens')

export const whatsappE164Schema = z
  .string()
  .regex(/^\+[1-9][0-9]{6,14}$/, 'Use formato internacional (+55...)')

export const lojaCreateSchema = z.object({
  nome: z.string().trim().min(1, 'Nome obrigatório').max(80, 'Máximo 80 caracteres'),
  slug: slugSchema,
  email: z.string().trim().email('E-mail inválido').toLowerCase(),
  cota_try_on_mensal: z
    .number()
    .int('Cota deve ser inteira')
    .min(0, 'Cota não pode ser negativa')
    .max(100_000, 'Cota muito alta')
    .default(200),
})
export type LojaCreateInput = z.infer<typeof lojaCreateSchema>

export const lojaUpdateSchema = z.object({
  nome: z.string().trim().min(1).max(80).optional(),
  slug: slugSchema.optional(),
  instagram: z
    .string()
    .trim()
    .max(50)
    .regex(/^[a-zA-Z0-9._]*$/, 'Apenas letras, números, ponto e underscore')
    .optional()
    .or(z.literal('')),
  tiktok: z
    .string()
    .trim()
    .max(50)
    .regex(/^[a-zA-Z0-9._]*$/, 'Apenas letras, números, ponto e underscore')
    .optional()
    .or(z.literal('')),
  whatsapp_e164: whatsappE164Schema.optional().or(z.literal('')),
  exibir_preco_publico: z.boolean().optional(),
})
export type LojaUpdateInput = z.infer<typeof lojaUpdateSchema>

/**
 * Gera um slug a partir de um nome — normaliza acentos e remove caracteres não-permitidos.
 * Mesma lógica usada no design (super-admin, modal "Nova loja").
 */
export function nomeToSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}
