import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { fail, ok } from '@/lib/api/response'
import {
  loadPublicPecasPage,
  VITRINE_PUBLIC_PAGE_SIZE,
} from '@/server/pecas/public'

/**
 * Página adicional de peças pra vitrine pública — usada pelo botão
 * "Carregar mais" do grid.
 *
 * Acessível anonimamente: a primeira página foi SSR no Server Component
 * de /v/[slug]; páginas seguintes fazem fetch CSR.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const querySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(VITRINE_PUBLIC_PAGE_SIZE * 4)
    .default(VITRINE_PUBLIC_PAGE_SIZE),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries()),
  )
  if (!parsed.success) {
    return fail('Parâmetros inválidos', 'VALIDATION_ERROR', 400)
  }

  // Precisamos do loja_id pra mapear categorias — pegamos pelo slug no RPC.
  const supabase = createServerSupabase()
  const { data: lojaArr } = await supabase.rpc('get_vitrine_publica', {
    p_slug: params.slug,
  })
  const loja = lojaArr?.[0]
  if (!loja) return fail('Loja não encontrada', 'NOT_FOUND', 404)

  try {
    const page = await loadPublicPecasPage(
      params.slug,
      loja.loja_id,
      parsed.data.offset,
      parsed.data.limit,
    )
    return ok(page)
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : 'Falha ao carregar peças',
      'LOAD_FAIL',
      500,
    )
  }
}
