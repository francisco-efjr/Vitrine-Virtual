import { notFound } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PublicLiveRefresh } from '@/components/public/public-live-refresh'
import { VitrineGrid } from '@/components/public/vitrine-grid'
import { LojaMark, VVLogo } from '@/components/brand/vv-logo'
import { buildVitrineMessage, buildWhatsAppUrl } from '@/lib/whatsapp/link'
import { buildLojaAssetPublicUrl } from '@/server/lojas/assets'

export const dynamic = 'force-dynamic'

interface VitrineData {
  loja: {
    loja_id: string
    nome: string
    slug: string
    instagram: string | null
    tiktok: string | null
    whatsapp_e164: string | null
    exibir_preco_publico: boolean
    tagline: string | null
    logo_url: string | null
    cabine_backdrop_url: string | null
  }
  pecas: Array<{
    peca_id: string
    nome: string
    tamanho: string | null
    preco_centavos: number | null
    foto_principal_path: string | null
    foto_principal_url: string | null
    categoria_id: string | null
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

  // Fundo personalizado da Cabine + categoria das peças não vêm do RPC público.
  // Lemos via service client (são campos seguros: caminho + id de categoria).
  const service = createServiceClient()
  const [{ data: cabineCfg }, { data: pecasCats }] = await Promise.all([
    service
      .from('lojas')
      .select('provador_fundo_storage_path, provador_fundo_tipo')
      .eq('slug', slug)
      .maybeSingle(),
    service
      .from('pecas')
      .select('id, categoria_id')
      .eq('loja_id', loja.loja_id)
      .eq('status', 'disponivel'),
  ])
  const catMap = new Map<string, string | null>()
  for (const row of pecasCats ?? []) catMap.set(row.id, row.categoria_id)

  const cabineBackdropUrl =
    cabineCfg?.provador_fundo_tipo === 'personalizado'
      ? buildLojaAssetPublicUrl(cabineCfg?.provador_fundo_storage_path ?? null)
      : null

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
        categoria_id: catMap.get(peca.peca_id) ?? null,
      }
    }),
  )

  return {
    loja: {
      loja_id: loja.loja_id,
      nome: loja.nome,
      slug: loja.slug,
      instagram: loja.instagram,
      tiktok: loja.tiktok,
      whatsapp_e164: loja.whatsapp_e164,
      exibir_preco_publico: loja.exibir_preco_publico,
      tagline: loja.tagline ?? null,
      logo_url: buildLojaAssetPublicUrl(loja.logo_storage_path ?? null),
      cabine_backdrop_url: cabineBackdropUrl,
    },
    pecas,
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const data = await loadVitrine(params.slug)
  if (!data) return { title: 'Loja não encontrada' }
  return {
    title: `${data.loja.nome} · Vitrine Virtual`,
    description: data.loja.tagline ?? `Vitrine de ${data.loja.nome} — peças com Cabine virtual.`,
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
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <LojaMark
              loja={{ nome: data.loja.nome, logo_url: data.loja.logo_url }}
              size={38}
              radius={10}
            />
            <div className="min-w-0">
              <div className="truncate font-serif text-[20px] font-normal leading-tight tracking-tight text-ink sm:text-[24px]">
                {data.loja.nome}
              </div>
              {data.loja.tagline ? (
                <div className="truncate font-sans text-[11px] italic text-ink-3 sm:text-xs">
                  {data.loja.tagline}
                </div>
              ) : null}
            </div>
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

      {/* Cabine banner */}
      <div className="bg-accent-light">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-10">
          <span className="font-serif text-[13.5px] font-medium text-accent-dark sm:text-[14px]">
            ✦ Cabine Virtual — experimente antes de escolher
          </span>
          <span className="font-sans text-[11.5px] text-accent-dark">
            Clique em qualquer peça
          </span>
        </div>
      </div>

      {/* Grid */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-10 sm:py-10">
        <div className="mb-5 flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-[20px] font-medium tracking-tight text-ink sm:text-[22px]">
            Peças disponíveis
          </h2>
        </div>

        <VitrineGrid
          slug={data.loja.slug}
          pecas={data.pecas}
          exibirPreco={data.loja.exibir_preco_publico}
          whatsappE164={data.loja.whatsapp_e164}
          cabineBackdropUrl={data.loja.cabine_backdrop_url}
        />
      </main>

      {/* Store banner footer */}
      <footer className="mt-4 bg-ink px-4 py-10 text-center sm:px-12">
        <div className="mx-auto max-w-sm">
          <div className="mb-4 flex justify-center">
            <LojaMark
              loja={{ nome: data.loja.nome, logo_url: data.loja.logo_url }}
              size={54}
              radius={14}
            />
          </div>
          <div className="mb-2 font-serif text-[22px] font-medium tracking-wide text-surface sm:text-[24px]">
            {data.loja.nome}
          </div>
          {data.loja.tagline ? (
            <div className="mb-5 font-sans text-[11.5px] uppercase tracking-[0.06em] text-white/55">
              {data.loja.tagline}
            </div>
          ) : null}
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
          <div className="mt-4 flex justify-center">
            <VVLogo size={18} variant="light" />
          </div>
        </div>
      </footer>
    </div>
  )
}

function IconInstagram() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
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
