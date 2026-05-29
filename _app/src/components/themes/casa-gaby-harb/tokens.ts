/**
 * Casa Gaby Harb — design tokens.
 *
 * Verde musgo é o "abraço". Dourado é pontuação, nunca decoração de fundo.
 * Creme respira. Preto é tipografia/fundo alternativo.
 *
 * Source of truth: _design/vitrine-virtual/project/cgh/brand.jsx
 * Brief: _design/prompt-designer-casa-gaby-harb.md
 */
export const CGH = {
  // greens — "a casa"
  musgo: '#1F3A2A',
  musgo2: '#2A4A35',
  musgoDeep: '#162a1f',
  // gold — pontuação
  gold: '#C9A961',
  goldHi: '#E7CD8F',
  goldLo: '#A6864A',
  // neutrals
  ink: '#0A0A0A',
  ink2: '#23201c',
  cream: '#F5EFE6',
  cream2: '#FBF7F0',
  cream3: '#EDE3D2',
  areia: '#D9C9A8',
  // accents (campanha / calor — uso pontual)
  caramelo: '#B8763B',
  borgonha: '#6B1F1F',
  // derived text on dark
  onDarkMut: 'rgba(245,239,230,0.62)',
  onDarkFaint: 'rgba(245,239,230,0.34)',
} as const

/** Gold-foil metallic gradient — para o monograma e barras finas. */
export const GOLD_FOIL = `linear-gradient(135deg, ${CGH.goldLo} 0%, ${CGH.goldHi} 38%, ${CGH.gold} 62%, ${CGH.goldLo} 100%)`
