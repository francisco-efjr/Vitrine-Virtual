import { notFound } from 'next/navigation'
import { Sparkles, MessageCircle } from 'lucide-react'
import Link from 'next/link'
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
    description: `Vitrine de ${data.loja.nome} — peças disponíveis com provador virtual.`,
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
      <header className="sticky top-0 z-10 border-b border-border bg-surface px-4 py-4 sm:px-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <div className="font-serif text-2xl font-semibold tracking-wider">
              {data.loja.nome}
            </div>
            {data.loja.instagram ? (
              <div className="text-xs text-ink-3">@{data.loja.instagram}</div>
            ) : null}
          </div>
          <nav className="flex items-center gap-2">
            {data.loja.instagram ? (
              <a
                href={`https://instagram.com/${data.loja.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-surface-2 px-3 py-1.5 text-xs text-ink-2 transition hover:text-ink"
              >
                Instagram
              </a>
            ) : null}
            {data.loja.tiktok ? (
              <a
                href={`https://tiktok.com/@${data.loja.tiktok}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-surface-2 px-3 py-1.5 text-xs text-ink-2 transition hover:text-ink"
              >
                TikTok
              </a>
            ) : null}
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#25d366] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1fb155]"
              >
                <MessageCircle size={12} />
                WhatsApp
              </a>
            ) : null}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-accent-light px-4 py-4 sm:px-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-1 sm:flex-row">
          <div className="font-serif text-sm font-medium text-accent-dark sm:text-base">
            <Sparkles size={14} className="mr-1.5 inline" />
            Provador virtual com IA — experimente antes de comprar
          </div>
          <div className="text-xs text-accent-dark hidden sm:block">
            Toque em qualquer peça para provar
          </div>
        </div>
      </div>

      {/* Grid */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-12 sm:py-10">
        <div className="mb-5 flex items-center justify-between">
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
                className="overflow-hidden rounded-card bg-surface shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <div className="aspect-[4/5] w-full bg-[#f0ebe3]" aria-hidden="true">
                  {p.foto_principal_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.foto_principal_url}
                      alt={p.nome}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-3 sm:p-4">
                  <div className="text-sm font-medium leading-snug">{p.nome}</div>
                  {p.tamanho ? (
                    <div className="mt-1 text-xs text-ink-3">{p.tamanho}</div>
                  ) : null}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {data.loja.exibir_preco_publico && p.preco_centavos != null ? (
                      <span className="font-serif text-base font-semibold sm:text-lg">
                        {formatPreco(p.preco_centavos)}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-3">Consulte</span>
                    )}
                    <span
                      className="inline-flex items-center rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white"
                    >
                      Ver peça
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 flex items-center justify-center gap-2 rounded-card bg-[#25d366] py-3.5 font-semibold text-white transition hover:bg-[#1fb155] sm:mx-auto sm:max-w-md"
          >
            <MessageCircle size={18} />
            Falar com a loja no WhatsApp
          </a>
        ) : null}

        <p className="mt-8 text-center text-xs text-ink-3">
          Vitrine criada com <span className="text-accent">vitrine.app</span>
        </p>
      </main>
    </div>
  )
}
