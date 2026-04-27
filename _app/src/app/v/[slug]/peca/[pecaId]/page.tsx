import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { formatPreco } from '@/lib/validators/peca'
import { buildVitrineMessage, buildWhatsAppUrl } from '@/lib/whatsapp/link'
import { TryOnButton } from '@/components/public/try-on-button'
import { GaleriaFotos } from '@/components/public/galeria-fotos'

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

  // Gera signed URLs para as fotos (bucket privado — service role necessário)
  const fotos: FotoItem[] = Array.isArray(peca.fotos) ? (peca.fotos as FotoItem[]) : []
  let fotosComUrl: Array<{ id: string; url: string; storage_path: string }> = []

  if (fotos.length > 0) {
    const service = createServiceClient()
    const results = await Promise.all(
      fotos.map(async (foto) => {
        const { data } = await service.storage
          .from('pecas-fotos')
          .createSignedUrl(foto.storage_path, 3600) // 1h para visualização
        return { id: foto.id, url: data?.signedUrl ?? '', storage_path: foto.storage_path }
      }),
    )
    fotosComUrl = results.filter((f) => f.url)
  }

  // URL de garment para o provador IA — TTL de 5 min (tempo de processamento)
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
          {/* Galeria de fotos da peça */}
          <GaleriaFotos
            fotos={fotosComUrl.map((f) => ({ id: f.id, url: f.url }))}
            pecaNome={peca.nome}
          />

          {/* Info + CTAs */}
          <div className="flex flex-col">
            <h1 class