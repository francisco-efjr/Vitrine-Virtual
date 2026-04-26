import type { Metadata } from 'next'
import { RecuperarSenhaClient } from './recuperar-client'

export const metadata: Metadata = {
  title: 'Recuperar senha · Vitrine Virtual',
  robots: { index: false, follow: false },
}

export default function RecuperarPage() {
  return <RecuperarSenhaClient />
}
