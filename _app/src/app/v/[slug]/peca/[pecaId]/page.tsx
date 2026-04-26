import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { formatPreco } from '@/lib/validators/peca'
import { buildVitrineMessage, buildWhatsAppUrl } from '@/lib/whatsapp/link'
import { TryOnButton } from '@/components/public/try-on-button'

export const dynamic = 'force-dynamic'

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

  const wa = loja.whatsapp_e164
    ? buildWhatsAppUrl(loja.whatsapp_e164, buildVitrineMessage({ pecaNome: peca.nome }))
    : null

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-surface px-4 py-3 sm:px-12">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link
            href={`/v/${params.slug}`}
            className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink"
          >
            <ArrowLeft size={14} />
            Voltar à vitrine
          </Link>
          <div className="font-serif text-sm font-semibold sm:text-base">{loja.nome}</div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-12">
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            {/* TODO: galeria de fotos com carrossel — peca.fotos[] */}
            <div className="aspect-[4/5] w-full rounded-modal bg-[#f0ebe3]" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-serif text-3xl font-semibold leading-tight">{peca.nome}</h1>
            {peca.tamanho ? (
              <div className="mt-2 text-sm text-ink-2">Tamanho: {peca.tamanho}</div>
            ) : null}
            {loja.exibir_preco_publico && peca.preco_centavos != null ? (
              <div className="mt-4 font-serif text-3xl font-semibold">
                {formatPreco(peca.preco_centavos)}
              </div>
            ) : (
              <div className="mt-4 text-sm text-ink-3">Consulte o preço com a loja</div>
            )}
            <div className="mt-8 flex flex-col gap-3">
              <TryOnButton
                pecaId={peca.peca_id}
                pecaNome={peca.nome}
                whatsappE164={loja.whatsapp_e164}
              />
              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25d366] px-6 py-3 text-sm font-semibold text-white"
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
