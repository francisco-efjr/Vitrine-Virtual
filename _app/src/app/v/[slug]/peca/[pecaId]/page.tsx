import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { PublicLiveRefresh } from '@/components/public/public-live-refresh'
import { TryOnButton } from '@/components/public/try-on-button'
import { GaleriaFotos } from '@/components/public/galeria-fotos'
import { LojaMark } from '@/components/brand/vv-logo'
import { formatPreco } from '@/lib/validators/peca'
import { formatSizes } from '@/lib/sizes'
import { getCategoriaLabel } from '@/lib/categorias'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { buildVitrineMessage, buildWhatsAppUrl } from '@/lib/whatsapp/link'
import { buildLojaAssetPublicUrl } from '@/server/lojas/assets'

export const dynamic = 'force-dynamic'

type FotoItem = { id: string; storage_path: string; ordem: number }

/**
 * P1-05 (v6): metadata + OG tags para link compartilhável.
 *
 * Antes a página tinha title herdado do layout ("vitrine — vv") e nenhuma OG
 * — colar o link num WhatsApp/iMessage não mostrava nada útil. Agora geramos
 * título no padrão "{Nome da peça} — {Loja}", description com categoria + cor
 * + preço (quando público) e og:image apontando para a foto principal da
 * peça (URL pública assinada por 1h, alinhada com o TTL dos signed URLs).
 */
export async function generateMetadata({
  params,
}: {
  params: { slug: string; pecaId: string }
}): Promise<Metadata> {
  const supabase = createServerSupabase()
  const [{ data: lojaArr }, { data: pecaArr }] = await Promise.all([
    supabase.rpc('get_vitrine_publica', { p_slug: params.slug }),
    supabase.rpc('get_peca_publica', { p_slug: params.slug, p_peca_id: params.pecaId }),
  ])
  const loja = lojaArr?.[0]
  const peca = pecaArr?.[0]
  if (!loja || !peca) {
    return { title: 'Peça não encontrada · vitrine' }
  }

  const fotos = Array.isArray(peca.fotos) ? (peca.fotos as FotoItem[]) : []
  let ogImageUrl: string | null = null
  if (fotos[0]) {
    const service = createServiceClient()
    const { data } = await service.storage
      .from('pecas-fotos')
      .createSignedUrl(fotos[0].storage_path, 60 * 60)
    ogImageUrl = data?.signedUrl ?? null
  }

  const priceText =
    loja.exibir_preco_publico && peca.preco_centavos != null
      ? ` · ${formatPreco(peca.preco_centavos)}`
      : ''
  const sizeText = peca.tamanho ? ` · Tam. ${formatSizes(peca.tamanho, ' · ')}` : ''

  const title = `${peca.nome} — ${loja.nome}`
  const description = `Peça única na vitrine de ${loja.nome}${priceText}${sizeText}. Experimente virtualmente.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: `vitrine · ${loja.nome}`,
      images: ogImageUrl ? [{ url: ogImageUrl, alt: peca.nome }] : undefined,
    },
    twitter: {
      card: ogImageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
  }
}

export default async function PecaPublicaPage({
  params,
}: {
  params: { slug: string; pecaId: string }
}) {
  const supabase = createServerSupabase()
  const [{ data: lojaArr }, { data: pecaArr }] = await Promise.all([
    supabase.rpc('get_vitrine_publica', { p_slug: params.slug }),
    supabase.rpc('get_peca_publica', { p_slug: params.slug, p_peca_id: params.pecaId }),
  ])

  const loja = lojaArr?.[0]
  const peca = pecaArr?.[0]
  if (!loja || !peca) notFound()

  // Service-client reads: categoria da peça (não vem do RPC público) e fundo
  // personalizado da Cabine. Campos seguros, só identificadores.
  const service = createServiceClient()
  const [{ data: cabineCfg }, { data: pecaMeta }] = await Promise.all([
    service
      .from('lojas')
      .select('provador_fundo_storage_path, provador_fundo_tipo')
      .eq('slug', params.slug)
      .maybeSingle(),
    service
      .from('pecas')
      .select('categoria_id')
      .eq('id', params.pecaId)
      .maybeSingle(),
  ])
  const cabineBackdropUrl =
    cabineCfg?.provador_fundo_tipo === 'personalizado'
      ? buildLojaAssetPublicUrl(cabineCfg?.provador_fundo_storage_path ?? null)
      : null
  const categoriaId = pecaMeta?.categoria_id ?? null
  const categoriaLabel = categoriaId ? getCategoriaLabel(categoriaId) : null

  const fotos = Array.isArray(peca.fotos) ? (peca.fotos as FotoItem[]) : []
  let fotosComUrl: Array<{ id: string; url: string; storage_path: string }> = []

  if (fotos.length > 0) {
    const results = await Promise.all(
      fotos.map(async (foto) => {
        const { data } = await service.storage
          .from('pecas-fotos')
          .createSignedUrl(foto.storage_path, 3600)
        return {
          id: foto.id,
          url: data?.signedUrl ?? '',
          storage_path: foto.storage_path,
        }
      }),
    )
    fotosComUrl = results.filter((item) => item.url)
  }

  let garmentSignedUrl: string | null = null
  if (fotosComUrl[0]) {
    const { data } = await service.storage
      .from('pecas-fotos')
      .createSignedUrl(fotosComUrl[0].storage_path, 5 * 60)
    garmentSignedUrl = data?.signedUrl ?? null
  }

  const wa = loja.whatsapp_e164
    ? buildWhatsAppUrl(loja.whatsapp_e164, buildVitrineMessage({ pecaNome: peca.nome }))
    : null

  const logoUrl = buildLojaAssetPublicUrl(loja.logo_storage_path ?? null)

  return (
    <div className="min-h-screen bg-bg pb-[88px] sm:pb-0">
      <PublicLiveRefresh />
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-10">
          <Link
            href={`/v/${params.slug}`}
            className="inline-flex items-center gap-1.5 font-sans text-[13px] text-ink-2 transition hover:text-ink"
          >
            <ArrowLeft size={14} />
            Voltar à vitrine
          </Link>
          <div className="flex items-center gap-2">
            <LojaMark
              loja={{ nome: loja.nome, logo_url: logoUrl }}
              size={28}
              radius={8}
            />
            <div className="font-serif text-sm font-medium tracking-tight text-ink sm:text-base">
              {loja.nome}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-10 sm:py-10">
        <div className="grid gap-6 sm:gap-10 md:grid-cols-2">
          <GaleriaFotos
            fotos={fotosComUrl.map((foto) => ({ id: foto.id, url: foto.url }))}
            pecaNome={peca.nome}
          />

          <div className="flex min-w-0 flex-col">
            {/*
              P1-05: breadcrumb com categoria + status disponível.
              Substitui o "Vitrine · {loja}" que duplicava o header.
            */}
            <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-2">
              {categoriaLabel ? <span>{categoriaLabel}</span> : null}
              {categoriaLabel ? <span aria-hidden="true">·</span> : null}
              <span className="text-success">Disponível</span>
            </div>
            <h1 className="font-serif text-[26px] font-semibold leading-tight tracking-tight text-ink sm:text-[32px]">
              {peca.nome}
            </h1>
            {peca.tamanho ? (
              <p className="mt-2 font-sans text-[13px] text-ink-2">
                Tamanhos disponíveis:{' '}
                <strong className="font-medium text-ink">{formatSizes(peca.tamanho, ' · ')}</strong>
              </p>
            ) : null}

            <div className="mt-5">
              {loja.exibir_preco_publico && peca.preco_centavos != null ? (
                <span className="font-serif text-[28px] font-semibold leading-none text-ink sm:text-[34px]">
                  {formatPreco(peca.preco_centavos)}
                </span>
              ) : (
                <span className="font-sans text-sm text-ink-2">
                  Consulte valores com a loja
                </span>
              )}
            </div>

            {/*
              P1-05: CTAs hierarchy — "Provar virtualmente" (primary) >
              "Falar no WhatsApp" (secondary). Em desktop ficam no hero;
              em mobile escondemos aqui e replicamos via sticky bottom.
            */}
            <div className="mt-7 hidden flex-col gap-3 sm:flex">
              <TryOnButton
                pecaId={peca.peca_id}
                pecaNome={peca.nome}
                pecaTamanho={peca.tamanho}
                pecaPrecoCentavos={peca.preco_centavos}
                exibirPreco={loja.exibir_preco_publico}
                whatsappE164={loja.whatsapp_e164}
                garmentImageUrl={garmentSignedUrl}
                garmentThumbUrl={fotosComUrl[0]?.url ?? null}
                cabineBackdropUrl={cabineBackdropUrl}
                size="lg"
              />

              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-6 py-3 font-sans text-sm font-medium text-ink transition hover:border-ink"
                >
                  <MessageCircle size={16} className="text-[#25d366]" />
                  Falar no WhatsApp
                </a>
              ) : null}
            </div>

            {/*
              P1-05: card de loja discreto, ancora a peça à loja sem
              competir com o CTA principal. Visível em desktop e mobile.
            */}
            <div className="mt-6 flex items-center gap-3 rounded-card border border-border bg-surface p-3 sm:mt-7">
              <LojaMark
                loja={{ nome: loja.nome, logo_url: logoUrl }}
                size={42}
                radius={11}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-sans text-[13.5px] font-medium text-ink">
                  {loja.nome}
                </div>
                <div className="font-sans text-[11.5px] text-ink-2">Vitrine virtual</div>
              </div>
              <Link
                href={`/v/${params.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-transparent px-3 py-1.5 font-sans text-[12px] font-medium text-ink-2 transition hover:border-ink hover:text-ink"
              >
                Ver loja
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/*
        P1-05: sticky bottom CTA — mobile only.
        Em telas <sm, escondemos o stack do hero e damos uma faixa fixa no
        rodapé com try-on primary + WhatsApp como botão compacto à esquerda.
        Resolve o sumiço do CTA em descrições longas.
      */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur sm:hidden"
        role="region"
        aria-label="Ações da peça"
      >
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Falar no WhatsApp"
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[12px] border border-border bg-surface px-3.5 py-3 font-sans text-[12.5px] font-medium text-ink transition hover:border-ink"
            >
              <MessageCircle size={16} className="text-[#25d366]" />
            </a>
          ) : null}
          <div className="min-w-0 flex-1">
            <TryOnButton
              pecaId={peca.peca_id}
              pecaNome={peca.nome}
              pecaTamanho={peca.tamanho}
              pecaPrecoCentavos={peca.preco_centavos}
              exibirPreco={loja.exibir_preco_publico}
              whatsappE164={loja.whatsapp_e164}
              garmentImageUrl={garmentSignedUrl}
              garmentThumbUrl={fotosComUrl[0]?.url ?? null}
              cabineBackdropUrl={cabineBackdropUrl}
              size="lg"
              fullWidth
            />
          </div>
        </div>
      </div>
    </div>
  )
}
