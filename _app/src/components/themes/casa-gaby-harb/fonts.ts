import { Cormorant_Garamond, Manrope, Pinyon_Script } from 'next/font/google'

/**
 * Casa Gaby Harb — tipografia editorial.
 *  - Cormorant Garamond (serifa, itálico nos títulos)
 *  - Manrope (sans para corpo / wordmark espaçado)
 *  - Pinyon Script (raro — monograma GH)
 *
 * Carregada só nesta variante de tema. Lojas no tema default não pagam o
 * download dessas fontes.
 */
export const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cgh-serif',
  display: 'swap',
})

export const manropeCGH = Manrope({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-cgh-sans',
  display: 'swap',
})

export const pinyonScript = Pinyon_Script({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-cgh-script',
  display: 'swap',
})

/** Aplique no wrapper raiz do tema pra disponibilizar as variáveis CSS. */
export const cghFontsClass = `${cormorant.variable} ${manropeCGH.variable} ${pinyonScript.variable}`
