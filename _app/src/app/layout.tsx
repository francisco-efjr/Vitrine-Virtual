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

export const metadata: Metadata = {
  title: 'Vitrine Virtual',
  description:
    'A vitrine online da sua loja de roupas, com Cabine virtual e link direto para WhatsApp.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={cn(bodoni.variable, manrope.variable)}>
      <body className="bg-bg text-ink font-sans antialiased min-h-screen">{children}</body>
    </html>
  )
}
