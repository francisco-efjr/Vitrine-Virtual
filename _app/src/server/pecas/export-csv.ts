import 'server-only'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { toCsv } from '@/lib/csv/export'
import { centavosToPrecoString } from '@/lib/validators/peca'

/**
 * Exporta CSV com todas as peças de uma loja.
 * Inclui: id, nome, preço (string formatada), tamanho, status, datas.
 */
export async function exportPecasCsv(lojaId: string): Promise<string> {
  const supabase = createServerSupabase()
  const { data: pecas, error } = await supabase
    .from('pecas')
    .select('id, nome, preco_centavos, tamanho, status, created_at, vendida_em')
    .eq('loja_id', lojaId)
    .order('created_at', { ascending: false })

  if (error) throw error

  const fmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  const rows = (pecas ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    preco: centavosToPrecoString(p.preco_centavos),
    tamanho: p.tamanho ?? '',
    status: p.status,
    data_cadastro: fmt.format(new Date(p.created_at)),
    data_venda: p.vendida_em ? fmt.format(new Date(p.vendida_em)) : '',
  }))

  return toCsv(rows, [
    { key: 'id', label: 'ID' },
    { key: 'nome', label: 'Nome' },
    { key: 'preco', label: 'Preço (R$)' },
    { key: 'tamanho', label: 'Tamanho' },
    { key: 'status', label: 'Status' },
    { key: 'data_cadastro', label: 'Cadastrada em' },
    { key: 'data_venda', label: 'Vendida em' },
  ])
}
