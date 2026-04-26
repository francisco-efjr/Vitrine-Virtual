import type { Metadata } from 'next'
import { Cormorant_Garamond, DM_Sans } from 'next/font/google'
import { cn } from '@/lib/utils'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
})

const dmsans = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dmsans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Vitrine Virtual',
  description:
    'A vitrine online da sua loja de roupas, com provador virtual por IA e link direto para WhatsApp.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={cn(cormorant.variable, dmsans.variable)}>
      <body className="bg-bg text-ink font-sans antialiased min-h-screen">{children}</body>
    </html>
  )
}
