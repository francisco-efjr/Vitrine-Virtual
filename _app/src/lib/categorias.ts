/**
 * Categorias pré-definidas (moda feminina) — espelham as do design entregue.
 * Uma loja pode adicionar categorias livres via cadastro de peça; quando isso
 * acontece, o id é gerado a partir do nome digitado (slug-like) e persistido
 * em `pecas.categoria_id`.
 */
export const CATEGORIAS = [
  { id: 'blusas', label: 'Blusas & Tops' },
  { id: 'calcas', label: 'Calças & Shorts' },
  { id: 'vestidos', label: 'Vestidos' },
  { id: 'saias', label: 'Saias' },
  { id: 'casacos', label: 'Casacos & Jaquetas' },
  { id: 'tricos', label: 'Tricôs & Moletons' },
  { id: 'acessorios', label: 'Acessórios' },
  { id: 'outros', label: 'Outros' },
] as const

export type CategoriaId = (typeof CATEGORIAS)[number]['id'] | string

export function getCategoriaLabel(id: string | null | undefined): string {
  if (!id) return 'Sem categoria'
  const found = CATEGORIAS.find((c) => c.id === id)
  if (found) return found.label
  // Categoria personalizada — recupera a forma "humana" capitalizando palavras.
  return id
    .split('-')
    .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
}

/**
 * Normaliza um nome livre em um id válido (slug-like, ASCII).
 * Mesma regra do design: "Bolsas de Festa" → "bolsas-de-festa".
 */
export function categoriaNameToId(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}
