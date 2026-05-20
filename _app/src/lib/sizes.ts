/**
 * Ordenação canônica de tamanhos de roupa.
 *
 * Regra: letras do menor → maior (PP → XGG), depois numéricos crescentes,
 * depois "Único" / personalizados (alfabéticos).
 *
 * Compartilhado entre vitrine pública, painel da loja e modal de peça
 * para garantir que `M · P · GG` apareça sempre como `P · M · GG`.
 */
const SIZE_ORDER = ['pp', 'p', 'm', 'g', 'gg', 'xg', 'xgg', 'xxg', 'xxgg']

type SizeScore = [number, number, string]

function scoreSize(value: string): SizeScore {
  const t = value.trim().toLowerCase()
  const idx = SIZE_ORDER.indexOf(t)
  if (idx >= 0) return [0, idx, t]
  const n = parseInt(t, 10)
  if (!Number.isNaN(n)) return [1, n, t]
  if (t === 'único' || t === 'unico') return [3, 0, t]
  return [2, 0, t]
}

export function sortSizes(arr: readonly string[] | null | undefined): string[] {
  if (!Array.isArray(arr)) return []
  return arr
    .slice()
    .filter((s) => typeof s === 'string' && s.trim().length > 0)
    .sort((a, b) => {
      const sa = scoreSize(a)
      const sb = scoreSize(b)
      if (sa[0] !== sb[0]) return sa[0] - sb[0]
      if (sa[1] !== sb[1]) return sa[1] - sb[1]
      return sa[2].localeCompare(sb[2])
    })
}

export function parseSizes(raw: string | null | undefined): string[] {
  if (!raw) return []
  return String(raw)
    .split(/[,·\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
}

/** Splits, sorts canonically, and rejoins as "PP, P, M, G". */
export function formatSizes(raw: string | null | undefined, separator = ', '): string {
  return sortSizes(parseSizes(raw)).join(separator)
}
