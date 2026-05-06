import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PublicLiveRefresh } from '@/components/public/public-live-refresh'
import { formatPreco } from '@/lib/validators/peca'
import { buildVitrineMessage, buildWhatsAppUrl } from '@/lib/whatsapp/link'

export const dynamic = 'force-dynamic'

interface VitrineData {
  loja: {
    nome: string
    slug: string
    instagram: string | null
    tiktok: string | null
    whatsapp_e164: string | null
    exibir_preco_publico: boolean
  }
  pecas: Array<{
    peca_id: string
    nome: string
    tamanho: string | null
    preco_centavos: number | null
    foto_principal_path: string | null
    foto_principal_url?: string | null
  }>
}

async function loadVitrine(slug: string): Promise<VitrineData | null> {
  const supabase = createServerSupabase()
  const [{ data: lojaArr }, { data: pecasArr }] = await Promise.all([
    supabase.rpc('get_vitrine_publica', { p_slug: slug }),
    supabase.rpc('get_pecas_publicas', { p_slug: slug }),
  ])
  const loja = lojaArr?.[0]
  if (!loja) return null
  const service = createServiceClient()
  const pecas = await Promise.all(
    (pecasArr ?? []).map(async (peca: VitrineData['pecas'][number]) => {
      let fotoPrincipalUrl: string | null = null
      if (peca.foto_principal_path) {
        const { data } = await service.storage
          .from('pecas-fotos')
          .createSignedUrl(peca.foto_principal_path, 3600)
        fotoPrincipalUrl = data?.signedUrl ?? null
      }

      return {
        ...peca,
        foto_principal_url: fotoPrincipalUrl,
      }
    }),
  )
  return {
    loja: {
      nome: loja.nome,
      slug: loja.slug,
      instagram: loja.instagram,
      tiktok: loja.tiktok,
      whatsapp_e164: loja.whatsapp_e164,
      exibir_preco_publico: loja.exibir_preco_publico,
    },
    pecas,
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const data = await loadVitrine(params.slug)
  if (!data) return { title: 'Loja não encontrada' }
  return {
    title: `${data.loja.nome} · Vitrine Virtual`,
    description: `Vitrine de ${data.loja.nome} — peças disponíveis com cabine virtual.`,
    openGraph: { title: data.loja.nome, type: 'website' },
  }
}

export default async function VitrinePage({ params }: { params: { slug: string } }) {
  const data = await loadVitrine(params.slug)
  if (!data) notFound()

  const wa = data.loja.whatsapp_e164
    ? buildWhatsAppUrl(data.loja.whatsapp_e164, buildVitrineMessage({ lojaNome: data.loja.nome }))
    : null

  return (
    <div className="min-h-screen bg-bg">
      <PublicLiveRefresh />

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur sm:px-12">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="font-serif text-xl font-semibold tracking-wider text-ink sm:text-2xl">
            {data.loja.nome}
          </div>
          <nav className="flex items-center gap-2">
            {data.loja.instagram ? (
              <a
                href={`https://instagram.com/${data.loja.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-ink-2 transition hover:bg-surface-3 hover:text-ink"
              >
                <IconInstagram />
              </a>
            ) : null}
            {data.loja.tiktok ? (
              <a
                href={`https://tiktok.com/@${data.loja.tiktok}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-ink-2 transition hover:bg-surface-3 hover:text-ink"
              >
                <IconTikTok />
              </a>
            ) : null}
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25d366] text-white transition hover:bg-[#1fb155]"
              >
                <MessageCircle size={16} />
              </a>
            ) : null}
          </nav>
        </div>
      </header>

      {/* Grid */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-12 sm:py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="font-serif text-xl font-medium sm:text-[22px]">Peças disponíveis</h2>
          <span className="text-xs text-ink-3 sm:text-sm">{data.pecas.length} itens</span>
        </div>

        {data.pecas.length === 0 ? (
          <div className="rounded-card border border-border bg-surface p-12 text-center">
            <p className="text-sm text-ink-2">Nenhuma peça disponível no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
            {data.pecas.map((p) => (
              <Link
                key={p.peca_id}
                href={`/v/${data.loja.slug}/peca/${p.peca_id}`}
                className="flex h-full flex-col overflow-hidden rounded-card bg-surface shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                {/* 3:4 portrait ratio */}
                <div className="aspect-[3/4] w-full bg-[#f0ebe3]" aria-hidden="true">
                  {p.foto_principal_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.foto_principal_url}
                      alt={p.nome}
                      className="h-full w-full object-cover object-center"
                    />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col p-3 sm:p-4">
                  <div className="text-sm font-medium leading-snug">{p.nome}</div>
                  {p.tamanho ? (
                    <div className="mt-1 text-xs text-ink-3">{p.tamanho}</div>
                  ) : null}
                  <div className="mt-auto pt-3">
                    {data.loja.exibir_preco_publico && p.preco_centavos != null ? (
                      <span className="font-serif text-base font-semibold sm:text-lg">
                        {formatPreco(p.preco_centavos)}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-3">Experimentar</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Store banner */}
      <footer className="mt-4 bg-ink px-4 py-10 text-center sm:px-12">
        <div className="mx-auto max-w-sm">
          <div className="mb-4 font-serif text-2xl font-medium tracking-wider text-surface">
            {data.loja.nome}
          </div>
          <div className="mb-6 flex items-center justify-center gap-3">
            {data.loja.instagram ? (
              <a
                href={`https://instagram.com/${data.loja.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <IconInstagram />
              </a>
            ) : null}
            {data.loja.tiktok ? (
              <a
                href={`https://tiktok.com/@${data.loja.tiktok}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <IconTikTok />
              </a>
            ) : null}
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25d366] text-white transition hover:bg-[#1fb155]"
              >
                <MessageCircle size={18} />
              </a>
            ) : null}
          </div>
          <div className="text-[11px] uppercase tracking-widest text-white/30">vitrine.app</div>
        </div>
      </footer>
    </div>
  )
}

function IconInstagram() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconTikTok() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.78 1.52v-3.4a4.85 4.85 0 01-1.01-.12z" />
    </svg>
  )
}
