/** @type {import('next').NextConfig} */

/**
 * Content-Security-Policy.
 *
 * DECISÕES DE DESIGN:
 *
 * script-src 'unsafe-inline':
 *   Next.js App Router injeta scripts inline para hidratação (__NEXT_DATA__,
 *   chunks de RSC). Remover 'unsafe-inline' exige nonces propagados por toda
 *   a árvore de componentes — não implementado neste MVP. Mantemos 'unsafe-inline'
 *   conscientes de que ele enfraquece a proteção XSS via script, mas os outros
 *   atributos (object-src, base-uri, connect-src) ainda oferecem defesa real.
 *
 * frame-ancestors 'none':
 *   Redundante com X-Frame-Options: DENY mas protege navegadores modernos que
 *   ignoram X-Frame-Options em favor de CSP.
 *
 * connect-src inclui wss://*.supabase.co:
 *   O Supabase Realtime usa WebSocket. Sem isso, subscrições de real-time do
 *   browser seriam bloqueadas.
 *
 * img-src inclui CDNs dos providers:
 *   O resultado do try-on (URL retornada pelo provider) é renderizado no browser
 *   via <img>. Os domínios aqui espelham os RESULT_TRUSTED_HOSTNAMES do allowlist.
 *
 * font-src 'self':
 *   next/font/google baixa as fontes em build-time e serve de /_next/static/
 *   — nenhuma requisição a fonts.googleapis.com em runtime.
 */
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com;
  style-src 'self' 'unsafe-inline';
  font-src 'self';
  img-src 'self' data: blob:
    https://*.supabase.co
    https://cdn.fashn.ai
    https://replicate.delivery
    https://pbxt.replicate.delivery
    https://storage.googleapis.com
    https://*.blob.core.windows.net;
  connect-src 'self'
    https://*.supabase.co
    wss://*.supabase.co
    https://challenges.cloudflare.com;
  frame-src https://challenges.cloudflare.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\n/g, ' ')
  .replace(/ {2,}/g, ' ')
  .trim()

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Inclui modelos ONNX no bundle do API route que roda os acceptance checks
    // server-side (acceptance/subject-count.ts). Sem isso o Vercel não copia o
    // .onnx para o ambiente da função e a inferência fica indisponível.
    // Em Next 14 essa chave vive dentro de `experimental` — fora dela o Next
    // ignora silenciosamente (era o caso até este commit, gerando o warning
    // "Unrecognized key(s) in object: 'outputFileTracingIncludes'" no build).
    outputFileTracingIncludes: {
      '/api/try-on': ['./models/**/*'],
    },
    // onnxruntime-node carrega .node nativos via require() — não bundlar pelo
    // webpack do Next; deixar como external no server bundle evita "Cannot
    // find module .../onnxruntime_binding.node" durante "Collecting page data".
    serverComponentsExternalPackages: ['onnxruntime-node', 'sharp'],
  },
  // Security headers (OWASP-aligned — veja comentários acima para decisões de CSP)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: ContentSecurityPolicy },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
  images: {
    // Supabase Storage public bucket + FASHN result CDN (configured at runtime)
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'cdn.fashn.ai' },
      { protocol: 'https', hostname: 'replicate.delivery' },
    ],
  },
}

export default nextConfig
