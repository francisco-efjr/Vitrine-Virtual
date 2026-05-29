import { z } from 'zod'

/**
 * Validators de loja — usados tanto no front quanto nas API routes/server actions.
 * Cada schema reflete os checks da migration 20260425000001_schema_inicial.sql.
 */

export const SLUG_MIN = 3
export const SLUG_MAX = 60

export const slugSchema = z
  .string()
  .min(SLUG_MIN, `Slug deve ter ao menos ${SLUG_MIN} caracteres`)
  .max(SLUG_MAX, `Slug muito longo (máx ${SLUG_MAX})`)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use apenas letras minúsculas, números e hífens')

/**
 * Slugs reservados — não podem ser usados como URL pública de loja
 * (colidem com rotas do app ou são institucionais).
 * Fonte de verdade compartilhada entre front (preview/validação) e back.
 */
export const SLUG_RESERVED: readonly string[] = [
  'admin',
  'api',
  'app',
  'auth',
  'www',
  'vitrine',
  'vitrinevirtual',
  'dashboard',
  'login',
  'signup',
  'logout',
  'super',
  'superadmin',
  'painel',
  'privacidade',
  'termos',
  'contato',
  'about',
  'sobre',
  'help',
  'ajuda',
  'suporte',
  'v',
  '_next',
  'static',
  'public',
]

/**
 * Normaliza o que o usuário digita NO CAMPO de slug, a cada tecla, sem nunca
 * entrar num estado quebrado: minúsculas, sem acentos, só [a-z0-9-], sem hífen
 * duplicado. NÃO remove hífens das pontas enquanto digita (só no blur/save) —
 * isso é o que tornava o input "travado" no bug original.
 */
export function sanitizeSlug(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .slice(0, SLUG_MAX)
}

/** Apara hífens das pontas — usado no blur e antes de salvar. */
export function trimSlugHyphens(value: string): string {
  return value.replace(/^-+|-+$/g, '')
}

/** Validação amigável para a UI (mensagens em PT-BR, mesmas regras do back). */
export function validateSlug(slug: string): { ok: boolean; msg: string } {
  if (!slug) return { ok: false, msg: 'Defina uma URL para a loja.' }
  if (slug.length < SLUG_MIN) return { ok: false, msg: `Mínimo ${SLUG_MIN} caracteres.` }
  if (/^-|-$/.test(slug)) return { ok: false, msg: 'Não pode começar ou terminar com hífen.' }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))
    return { ok: false, msg: 'Use apenas letras minúsculas, números e hífens.' }
  if (SLUG_RESERVED.includes(slug))
    return { ok: false, msg: 'Esta URL é reservada — escolha outra.' }
  return { ok: true, msg: '' }
}

export const aiImageModelSchema = z.enum(['high', 'medium'])

export const vitrineThemeSchema = z.enum(['default', 'CasaGabyHarb'])

function normalizeSocialHandle(value: unknown): unknown {
  if (typeof value !== 'string') return value
  return value.trim().replace(/^@+/, '')
}

function normalizeWhatsApp(value: unknown): unknown {
  if (typeof value !== 'string') return value
  return value.trim().replace(/\s+/g, '').replace(/[()-]/g, '')
}

export const whatsappE164Schema = z.preprocess(
  normalizeWhatsApp,
  z
    .string()
    .regex(
      /^\+[1-9][0-9]{6,14}$/,
      'WhatsApp inválido. Use o formato internacional completo, por exemplo: +5511999999999',
    ),
)

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
  ai_image_model: aiImageModelSchema.default('medium'),
})
export type LojaCreateInput = z.infer<typeof lojaCreateSchema>

export const provadorFundoTipoSchema = z.enum(['branco', 'personalizado', 'cliente'])

export const lojaUpdateSchema = z.object({
  nome: z.string().trim().min(1, 'Nome da loja é obrigatório').max(80, 'Nome da loja muito longo').optional(),
  tagline: z
    .string()
    .trim()
    .max(140, 'Tagline muito longa (máx 140 caracteres)')
    .nullable()
    .optional()
    .or(z.literal('')),
  instagram: z.preprocess(
    normalizeSocialHandle,
    z
      .string()
      .trim()
      .max(50, 'Instagram muito longo')
      .regex(/^[a-zA-Z0-9._]*$/, 'Instagram inválido. Use apenas letras, números, ponto e underscore')
      .optional()
      .or(z.literal('')),
  ),
  tiktok: z.preprocess(
    normalizeSocialHandle,
    z
      .string()
      .trim()
      .max(50, 'TikTok muito longo')
      .regex(/^[a-zA-Z0-9._]*$/, 'TikTok inválido. Use apenas letras, números, ponto e underscore')
      .optional()
      .or(z.literal('')),
  ),
  whatsapp_e164: whatsappE164Schema.optional().or(z.literal('')),
  exibir_preco_publico: z.boolean().optional(),
  vitrine_publica_visivel: z.boolean().optional(),
  provador_fundo_tipo: provadorFundoTipoSchema.optional(),
  provador_fundo_storage_path: z.string().trim().max(500).nullable().optional(),
  ai_image_model: aiImageModelSchema.optional(),
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
