import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { PublicLiveRefresh } from '@/components/public/public-live-refresh'
import { TryOnButton } from '@/components/public/try-on-button'
import { GaleriaFotos } from '@/components/public/galeria-fotos'
import { LojaMark } from '@/components/brand/vv-logo'
import { formatPreco } from '@/lib/validators/peca'
import { formatSizes } from '@/lib/sizes'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { buildVitrineMessage, buildWhatsAppUrl } from '@/lib/whatsapp/link'
import { buildLojaAssetPublicUrl } from '@/server/lojas/assets'

export const dynamic = 'force-dynamic'

type FotoItem = { id: string; storage_path: string; ordem: number }

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

  const { data: cabineCfg } = await createServiceClient()
    .from('lojas')
    .select('provador_fundo_storage_path, provador_fundo_tipo')
    .eq('slug', params.slug)
    .maybeSingle()
  const cabineBackdropUrl =
    cabineCfg?.provador_fundo_tipo === 'personalizado'
      ? buildLojaAssetPublicUrl(cabineCfg?.provador_fundo_storage_path ?? null)
      : null

  const fotos = Array.isArray(peca.fotos) ? (peca.fotos as FotoItem[]) : []
  let fotosComUrl: Array<{ id: string; url: string; storage_path: string }> = []

  if (fotos.length > 0) {
    const service = createServiceClient()
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
    const service = createServiceClient()
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
    <div className="min-h-screen bg-bg">
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
            <div className="mb-3 font-sans text-[9.5px] font-semibold uppercase tracking-[0.18em] text-ink-3">
              Vitrine · {loja.nome}
            </div>
            <h1 className="font-serif text-[26px] font-semibold leading-tight tracking-tight text-ink sm:text-[32px]">
              {peca.nome}
            </h1>
            {peca.tamanho ? (
              <p className="mt-2 font-sans text-[13px] text-ink-3">
                Tamanhos disponíveis:{' '}
                <strong className="font-medium text-ink-2">{formatSizes(peca.tamanho, ' · ')}</strong>
              </p>
            ) : null}

            <div className="mt-5">
              {loja.exibir_preco_publico && peca.preco_centavos != null ? (
                <span className="font-serif text-[24px] font-semibold text-ink">
                  {formatPreco(peca.preco_centavos)}
                </span>
              ) : (
                <span className="font-sans text-sm text-ink-3">
                  Consulte valores com a loja
                </span>
              )}
            </div>

            <div className="mt-7 flex flex-col gap-3">
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
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25d366] px-6 py-3 font-sans text-sm font-semibold text-white transition hover:bg-[#1fb155]"
                >
                  <MessageCircle size={16} />
                  Falar no WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
