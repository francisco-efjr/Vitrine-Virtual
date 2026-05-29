import 'server-only'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

/** Tamanho default de página da vitrine pública. */
export const VITRINE_PUBLIC_PAGE_SIZE = 24

export interface PublicPeca {
  peca_id: string
  nome: string
  tamanho: string | null
  preco_centavos: number | null
  foto_principal_path: string | null
  foto_principal_url: string | null
  categoria_id: string | null
}

export interface PublicPecasPage {
  pecas: PublicPeca[]
  total: number
  offset: number
  limit: number
  hasMore: boolean
}

/**
 * Carrega uma página de peças públicas da loja `slug`.
 *
 * Resolve internamente:
 *   - chamada RPC `get_pecas_publicas(p_slug, p_limit, p_offset)` (segura, RLS via SECURITY DEFINER)
 *   - mapa de categoria_id por peça via service client (campo seguro pra UI filtrar)
 *   - signed URLs do bucket `pecas-fotos` pra cada foto principal (TTL 1h)
 *
 * Retorna também o `total` global pra UI saber quando "Carregar mais" some.
 */
export async function loadPublicPecasPage(
  slug: string,
  loja_id: string,
  offset: number,
  limit: number,
): Promise<PublicPecasPage> {
  const supabase = createServerSupabase()
  const { data: rows, error } = await supabase.rpc('get_pecas_publicas', {
    p_slug: slug,
    p_limit: limit,
    p_offset: offset,
  })
  if (error) throw error

  type RpcRow = {
    peca_id: string
    nome: string
    tamanho: string | null
    preco_centavos: number | null
    foto_principal_path: string | null
    fotos_count: number
    created_at: string
    total_count: number
  }
  const safe = (rows ?? []) as RpcRow[]
  const total =
    typeof safe[0]?.total_count === 'number'
      ? Number(safe[0]?.total_count)
      : safe.length

  // Categoria por peça vem direto da tabela (RLS via service client) — não está
  // no RPC público porque é metadado de filtragem, não de exibição.
  const service = createServiceClient()
  const ids = safe.map((p) => p.peca_id)
  const catMap = new Map<string, string | null>()
  if (ids.length > 0) {
    const { data: cats } = await service
      .from('pecas')
      .select('id, categoria_id')
      .eq('loja_id', loja_id)
      .in('id', ids)
    for (const row of cats ?? []) catMap.set(row.id, row.categoria_id)
  }

  const pecas: PublicPeca[] = await Promise.all(
    safe.map(async (peca: RpcRow) => {
      let fotoPrincipalUrl: string | null = null
      if (peca.foto_principal_path) {
        const { data } = await service.storage
          .from('pecas-fotos')
          .createSignedUrl(peca.foto_principal_path, 3600)
        fotoPrincipalUrl = data?.signedUrl ?? null
      }
      return {
        peca_id: peca.peca_id,
        nome: peca.nome,
        tamanho: peca.tamanho,
        preco_centavos: peca.preco_centavos,
        foto_principal_path: peca.foto_principal_path,
        foto_principal_url: fotoPrincipalUrl,
        categoria_id: catMap.get(peca.peca_id) ?? null,
      }
    }),
  )

  return {
    pecas,
    total,
    offset,
    limit,
    hasMore: offset + pecas.length < total,
  }
}
