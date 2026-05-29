import { notFound } from 'next/navigation'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PublicLiveRefresh } from '@/components/public/public-live-refresh'
import { VitrineGrid } from '@/components/public/vitrine-grid'
import { ContactLinks } from '@/components/public/contact-links'
import { LojaMark, VVLogo } from '@/components/brand/vv-logo'
import { CGHVitrinePage } from '@/components/themes/casa-gaby-harb/vitrine-page'
import { buildVitrineMessage, buildWhatsAppUrl } from '@/lib/whatsapp/link'
import { buildLojaAssetPublicUrl } from '@/server/lojas/assets'
import {
  loadPublicPecasPage,
  VITRINE_PUBLIC_PAGE_SIZE,
  type PublicPeca,
} from '@/server/pecas/public'
import type { VitrineTheme } from '@/types/database'

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
    hero_image_url: string | null
    vitrine_theme: VitrineTheme
  }
  pecas: PublicPeca[]
  /** Total geral de peças disponíveis — usado pelo botão "Carregar mais". */
  totalPecas: number
}

async function loadVitrine(slug: string): Promise<VitrineData | null> {
  const supabase = createServerSupabase()
  const { data: lojaArr } = await supabase.rpc('get_vitrine_publica', {
    p_slug: slug,
  })
  const loja = lojaArr?.[0]
  if (!loja) return null

  // Primeira página de peças + fundo da Cabine em paralelo.
  const service = createServiceClient()
  const [page, { data: cabineCfg }] = await Promise.all([
    loadPublicPecasPage(slug, loja.loja_id, 0, VITRINE_PUBLIC_PAGE_SIZE),
    service
      .from('lojas')
      .select('provador_fundo_storage_path, provador_fundo_tipo')
      .eq('slug', slug)
      .maybeSingle(),
  ])

  const cabineBackdropUrl =
    cabineCfg?.provador_fundo_tipo === 'personalizado'
      ? buildLojaAssetPublicUrl(cabineCfg?.provador_fundo_storage_path ?? null)
      : null

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
      hero_image_url: buildLojaAssetPublicUrl(
        loja.hero_image_storage_path ?? null,
      ),
      vitrine_theme: (loja.vitrine_theme ?? 'default') as VitrineTheme,
    },
    pecas: page.pecas,
    totalPecas: page.total,
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

  // Tema visual escolhido pelo super-admin para esta loja. Quando a loja
  // tem identidade dedicada (ex: CasaGabyHarb), aplicamos o layout sob
  // medida — caso contrário, mantemos o look padrão da Vitrine Virtual.
  if (data.loja.vitrine_theme === 'CasaGabyHarb') {
    return (
      <>
        <PublicLiveRefresh />
        <CGHVitrinePage
          loja={data.loja}
          pecas={data.pecas}
          totalPecas={data.totalPecas}
          whatsappUrl={wa}
        />
      </>
    )
  }

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
            <ContactLinks
              lojaId={data.loja.loja_id}
              instagram={data.loja.instagram}
              tiktok={data.loja.tiktok}
              whatsappUrl={wa}
              variant="header"
            />
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
          totalPecas={data.totalPecas}
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
            <ContactLinks
              lojaId={data.loja.loja_id}
              instagram={data.loja.instagram}
              tiktok={data.loja.tiktok}
              whatsappUrl={wa}
              variant="footer"
            />
          </div>
          <div className="mt-4 flex justify-center">
            <VVLogo size={18} variant="light" />
          </div>
        </div>
      </footer>
    </div>
  )
}
