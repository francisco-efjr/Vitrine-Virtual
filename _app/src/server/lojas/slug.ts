import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import { nomeToSlug, slugSchema, SLUG_RESERVED } from '@/lib/validators/loja'

const RESERVED_SLUGS = new Set(SLUG_RESERVED)

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase())
}

/**
 * Verifica se um slug está disponível.
 * Não use para validar — use o validator Zod. Use isto antes de criar loja.
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const parsed = slugSchema.safeParse(slug)
  if (!parsed.success) return false
  if (isReservedSlug(slug)) return false

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('lojas')
    .select('id', { head: false, count: 'exact' })
    .eq('slug', slug)
    .limit(1)
  if (error) throw error
  return (data?.length ?? 0) === 0
}

/**
 * Sugere um slug a partir do nome, garantindo disponibilidade.
 * Se o slug base já existir, anexa sufixo numérico crescente (-2, -3, ...).
 */
export async function suggestSlug(nome: string, maxAttempts = 50): Promise<string> {
  const base = nomeToSlug(nome) || 'loja'
  if (await isSlugAvailable(base)) return base

  for (let i = 2; i <= maxAttempts; i++) {
    const candidate = `${base}-${i}`.slice(0, 60)
    if (await isSlugAvailable(candidate)) return candidate
  }
  // fallback: timestamp curto
  return `${base.slice(0, 50)}-${Date.now().toString(36).slice(-6)}`
}
