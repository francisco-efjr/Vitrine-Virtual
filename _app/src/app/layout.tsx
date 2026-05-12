import type { Metadata } from 'next'
import { Bodoni_Moda, Manrope } from 'next/font/google'
import { cn } from '@/lib/utils'
import './globals.css'

const bodoni = Bodoni_Moda({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-bodoni',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
})

// Favicon SVG — monograma "vv" itálico branco em quadrado preto, alinhado
// com a identidade da marca (handoff v4).
const FAVICON_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#1e1a17"/><text x="16" y="22" text-anchor="middle" font-family="'Bodoni Moda', Didot, Georgia, serif" font-size="20" font-style="italic" font-weight="600" fill="#ffffff" letter-spacing="0.5">vv</text></svg>`
const FAVICON_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(FAVICON_SVG)}`

export const metadata: Metadata = {
  title: 'vitrine — vv',
  description:
    'A vitrine online da sua loja de roupas, com Cabine virtual e link direto para WhatsApp.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  icons: {
    icon: [{ url: FAVICON_DATA_URL, type: 'image/svg+xml' }],
    shortcut: [{ url: FAVICON_DATA_URL, type: 'image/svg+xml' }],
    apple: [{ url: FAVICON_DATA_URL }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={cn(bodoni.variable, manrope.variable)}>
      <body className="bg-bg text-ink font-sans antialiased min-h-screen">{children}</body>
    </html>
  )
}
