import 'server-only'
import { getPublicEnv } from '@/lib/env'

/**
 * Allowlist de domínios confiáveis para URLs externas processadas server-side.
 *
 * POR QUÊ ISSO EXISTE (SSRF — Server-Side Request Forgery):
 * Quando o servidor faz fetch() de uma URL fornecida por um cliente externo,
 * um atacante pode apontar para recursos internos:
 *   - http://169.254.169.254/latest/meta-data/  → credenciais AWS/GCP via IMDS
 *   - http://localhost:3000/api/super-admin/*    → endpoints internos autenticados
 *   - http://10.0.0.1/                          → redes privadas do host
 *
 * Nunca faça fetch() server-side de uma URL fornecida pelo cliente sem
 * validar primeiro contra este allowlist.
 *
 * USO:
 *   - garment_url_override no try-on: isAllowedGarmentUrl()
 *   - result_url retornado pelo provider (fetch para acceptance): isAllowedResultUrl()
 */

// ---------------------------------------------------------------------------
// Domínios para imagens de peças (usados como garment no try-on)
// ---------------------------------------------------------------------------

/** Domínios confiáveis para URLs de peças vindas do cliente. */
const GARMENT_TRUSTED_HOSTNAMES = new Set([
  // CDN dos providers de IA (resultados e garments de teste)
  'cdn.fashn.ai',
  'replicate.delivery',
  'pbxt.replicate.delivery',
  // Google Storage (gerações Gemini)
  'storage.googleapis.com',
])

// ---------------------------------------------------------------------------
// Domínios para resultados de IA (fetched server-side para acceptance checks)
// ---------------------------------------------------------------------------

/** Domínios confiáveis para URLs de resultados gerados pelos providers. */
const RESULT_TRUSTED_HOSTNAMES = new Set([
  'cdn.fashn.ai',
  'replicate.delivery',
  'pbxt.replicate.delivery',
  'storage.googleapis.com',
  // OpenAI DALL-E / gpt-image-1 results (Azure Blob Storage da OpenAI)
  'oaidalleapiprodscus.blob.core.windows.net',
  'oaidalla.blob.core.windows.net',
])

// ---------------------------------------------------------------------------
// Funções públicas
// ---------------------------------------------------------------------------

/**
 * Verifica se `url` é segura para uso como garment image no try-on.
 * Permite Supabase Storage do projeto + domínios de CDN dos providers.
 */
export function isAllowedGarmentUrl(url: string): boolean {
  return isUrlInAllowlist(url, GARMENT_TRUSTED_HOSTNAMES, { allowSupabase: true })
}

/**
 * Verifica se `url` é segura para fetch server-side nos acceptance checks.
 * Permite todos os CDNs dos providers de IA + Supabase Storage.
 */
export function isAllowedResultUrl(url: string): boolean {
  return isUrlInAllowlist(url, RESULT_TRUSTED_HOSTNAMES, { allowSupabase: true })
}

// ---------------------------------------------------------------------------
// Implementação interna
// ---------------------------------------------------------------------------

interface AllowlistOptions {
  /** Se true, também permite *.supabase.co e o host do projeto configurado. */
  allowSupabase?: boolean
}

function isUrlInAllowlist(
  raw: string,
  allowedHostnames: ReadonlySet<string>,
  opts: AllowlistOptions = {},
): boolean {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return false // URL mal-formada
  }

  // Em produção, exige HTTPS obrigatoriamente.
  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    return false
  }

  const host = parsed.hostname.toLowerCase()

  if (allowedHostnames.has(host)) return true

  if (opts.allowSupabase) {
    // Qualquer subdomínio de supabase.co (ex: xyzabc.supabase.co)
    if (host.endsWith('.supabase.co')) return true

    // Host exato configurado no env (para instâncias self-hosted)
    try {
      const supabaseHost = new URL(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL).hostname.toLowerCase()
      if (host === supabaseHost) return true
    } catch {
      // env não configurado — não libera
    }
  }

  return false
}
