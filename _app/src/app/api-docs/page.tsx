import { notFound } from 'next/navigation'
import SwaggerUiClient from './SwaggerUiClient'

/**
 * Documentação Swagger — disponível APENAS em desenvolvimento.
 *
 * Em produção seria information disclosure: qualquer pessoa mapearia
 * todos os endpoints, schemas e erros da API.
 *
 * Os endpoints em si já são protegidos server-side (requireLojista /
 * requireSuperAdmin), mas expor a estrutura facilita ataques direcionados.
 */
export default function ApiDocsPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <SwaggerUiClient />
}
