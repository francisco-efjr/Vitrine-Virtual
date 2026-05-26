import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only e env antes de importar o módulo
vi.mock('server-only', () => ({}))
vi.mock('@/lib/env', () => ({
  getPublicEnv: () => ({ NEXT_PUBLIC_SUPABASE_URL: 'https://xyzabc123.supabase.co' }),
}))

import { isAllowedGarmentUrl, isAllowedResultUrl } from '../url-allowlist'

describe('isAllowedGarmentUrl', () => {
  describe('domínios confiáveis de CDN', () => {
    it('permite cdn.fashn.ai', () => {
      expect(isAllowedGarmentUrl('https://cdn.fashn.ai/garments/abc.jpg')).toBe(true)
    })
    it('permite replicate.delivery', () => {
      expect(isAllowedGarmentUrl('https://replicate.delivery/pbxt/abc/out.jpg')).toBe(true)
    })
    it('permite pbxt.replicate.delivery', () => {
      expect(isAllowedGarmentUrl('https://pbxt.replicate.delivery/abc.webp')).toBe(true)
    })
    it('permite storage.googleapis.com', () => {
      expect(isAllowedGarmentUrl('https://storage.googleapis.com/bucket/garment.jpg')).toBe(true)
    })
  })

  describe('Supabase Storage do projeto', () => {
    it('permite *.supabase.co (qualquer subdomínio)', () => {
      expect(isAllowedGarmentUrl('https://xyzabc123.supabase.co/storage/v1/object/sign/pecas-fotos/loja/peca/foto.webp?token=xxx')).toBe(true)
    })
    it('permite outros subdomínios supabase.co', () => {
      expect(isAllowedGarmentUrl('https://abcdef999.supabase.co/storage/v1/object/public/lojas-logos/logo.png')).toBe(true)
    })
  })

  describe('URLs maliciosas bloqueadas', () => {
    it('bloqueia localhost (SSRF interno)', () => {
      expect(isAllowedGarmentUrl('http://localhost:3000/api/super-admin/lojas')).toBe(false)
    })
    it('bloqueia 127.0.0.1', () => {
      expect(isAllowedGarmentUrl('http://127.0.0.1/secret')).toBe(false)
    })
    it('bloqueia AWS IMDS (169.254.169.254)', () => {
      expect(isAllowedGarmentUrl('http://169.254.169.254/latest/meta-data/')).toBe(false)
    })
    it('bloqueia IP de rede privada (10.x.x.x)', () => {
      expect(isAllowedGarmentUrl('http://10.0.0.1/internal')).toBe(false)
    })
    it('bloqueia domínio arbitrário', () => {
      expect(isAllowedGarmentUrl('https://evil.com/malware.jpg')).toBe(false)
    })
    it('bloqueia URL mal-formada', () => {
      expect(isAllowedGarmentUrl('not-a-url')).toBe(false)
    })
    it('bloqueia string vazia', () => {
      expect(isAllowedGarmentUrl('')).toBe(false)
    })
    it('bloqueia protocol-relative', () => {
      expect(isAllowedGarmentUrl('//evil.com/img.jpg')).toBe(false)
    })
    it('bloqueia file://', () => {
      expect(isAllowedGarmentUrl('file:///etc/passwd')).toBe(false)
    })
    it('bloqueia domínio parecido mas não é supabase.co', () => {
      expect(isAllowedGarmentUrl('https://evil-supabase.co/img.jpg')).toBe(false)
    })
    it('bloqueia subdomínio com supabase.co embutido no path', () => {
      expect(isAllowedGarmentUrl('https://evil.com/supabase.co/img.jpg')).toBe(false)
    })
  })
})

describe('isAllowedResultUrl', () => {
  it('permite cdn.fashn.ai', () => {
    expect(isAllowedResultUrl('https://cdn.fashn.ai/results/abc.webp')).toBe(true)
  })
  it('permite replicate.delivery', () => {
    expect(isAllowedResultUrl('https://replicate.delivery/pbxt/result.jpg')).toBe(true)
  })
  it('permite storage.googleapis.com', () => {
    expect(isAllowedResultUrl('https://storage.googleapis.com/gen-result.jpg')).toBe(true)
  })
  it('permite OpenAI blob storage', () => {
    expect(isAllowedResultUrl('https://oaidalleapiprodscus.blob.core.windows.net/private/result.jpg')).toBe(true)
  })
  it('permite supabase.co', () => {
    expect(isAllowedResultUrl('https://xyzabc123.supabase.co/storage/v1/object/public/try-on-results/img.webp')).toBe(true)
  })
  it('bloqueia domínio externo arbitrário', () => {
    expect(isAllowedResultUrl('https://attacker.com/xss.js')).toBe(false)
  })
  it('bloqueia localhost', () => {
    expect(isAllowedResultUrl('http://localhost/internal')).toBe(false)
  })
})
