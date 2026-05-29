'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ImageIcon, RefreshCw, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Toggle } from '@/components/ui/toggle'
import { Reveal } from '@/components/motion'
import { preparePreviewableImage } from '@/lib/images/client-standardize'
import { IMAGE_INVALID_FORMAT_MESSAGE } from '@/lib/images/upload'
import type { LojaRow } from '@/types/database'

interface ConfigClientProps {
  initialLoja: LojaRow
  initialLogoUrl: string | null
  initialFundoUrl: string | null
  initialHeroImageUrl: string | null
}

/**
 * Tela única de configurações da loja — handoff v3.
 *
 * Estrutura visual:
 *   1. Identidade   — logo (tile 64×64) + nome + tagline
 *   2. Contato      — WhatsApp + Instagram + TikTok
 *   3. Vitrine      — toggle "Vitrine visível" + toggle "Mostrar preços"
 *   4. Provador     — escolha entre fundo branco e personalizado (tiles compactos)
 *   5. Salvar       — botão único no rodapé
 */
export function ConfigClient({
  initialLoja,
  initialLogoUrl,
  initialFundoUrl,
  initialHeroImageUrl,
}: ConfigClientProps) {
  const [loja, setLoja] = useState(initialLoja)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl)
  const [fundoUrl, setFundoUrl] = useState<string | null>(initialFundoUrl)
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(initialHeroImageUrl)
  const [logoBusy, setLogoBusy] = useState(false)
  const [fundoBusy, setFundoBusy] = useState(false)
  const [heroBusy, setHeroBusy] = useState(false)
  const [logoErr, setLogoErr] = useState<string | null>(null)
  const [fundoErr, setFundoErr] = useState<string | null>(null)
  const [heroErr, setHeroErr] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const fundoInputRef = useRef<HTMLInputElement>(null)
  const heroInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (logoUrl?.startsWith('blob:')) URL.revokeObjectURL(logoUrl)
      if (fundoUrl?.startsWith('blob:')) URL.revokeObjectURL(fundoUrl)
      if (heroImageUrl?.startsWith('blob:')) URL.revokeObjectURL(heroImageUrl)
    }
  }, [logoUrl, fundoUrl, heroImageUrl])

  async function uploadAsset(
    file: File,
    kind: 'logo' | 'provador_fundo' | 'hero_image',
  ): Promise<{ public_url: string; storage_path: string; loja: LojaRow }> {
    const prepared = await preparePreviewableImage(file)
    const dataUrl = await fileToDataUrl(prepared.file)
    const res = await fetch('/api/loja/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind,
        filename: prepared.file.name,
        contentType: prepared.file.type,
        size: prepared.file.size,
        data_url: dataUrl,
      }),
    })
    const data = await res.json()
    URL.revokeObjectURL(prepared.previewUrl)
    if (!res.ok || !data.ok) {
      throw new Error(data?.error?.message ?? 'Falha ao enviar imagem')
    }
    return data.data as {
      public_url: string
      storage_path: string
      loja: LojaRow
    }
  }

  async function handleLogoFile(file: File | null) {
    if (!file || !file.type.startsWith('image/')) return
    setLogoBusy(true)
    setLogoErr(null)
    try {
      const result = await uploadAsset(file, 'logo')
      setLoja(result.loja)
      setLogoUrl(`${result.public_url}?t=${Date.now()}`)
    } catch (error) {
      setLogoErr(error instanceof Error ? error.message : IMAGE_INVALID_FORMAT_MESSAGE)
    } finally {
      setLogoBusy(false)
    }
  }

  async function handleFundoFile(file: File | null) {
    if (!file || !file.type.startsWith('image/')) return
    setFundoBusy(true)
    setFundoErr(null)
    try {
      const result = await uploadAsset(file, 'provador_fundo')
      setLoja(result.loja)
      setFundoUrl(`${result.public_url}?t=${Date.now()}`)
    } catch (error) {
      setFundoErr(error instanceof Error ? error.message : IMAGE_INVALID_FORMAT_MESSAGE)
    } finally {
      setFundoBusy(false)
    }
  }

  async function handleHeroFile(file: File | null) {
    if (!file || !file.type.startsWith('image/')) return
    setHeroBusy(true)
    setHeroErr(null)
    try {
      const result = await uploadAsset(file, 'hero_image')
      setLoja(result.loja)
      setHeroImageUrl(`${result.public_url}?t=${Date.now()}`)
    } catch (error) {
      setHeroErr(error instanceof Error ? error.message : IMAGE_INVALID_FORMAT_MESSAGE)
    } finally {
      setHeroBusy(false)
    }
  }

  async function clearHeroImage() {
    setHeroBusy(true)
    setHeroErr(null)
    try {
      const res = await fetch('/api/loja/assets?kind=hero_image', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data?.error?.message ?? 'Falha ao remover')
      setLoja(data.data as LojaRow)
      setHeroImageUrl(null)
    } catch (error) {
      setHeroErr(error instanceof Error ? error.message : 'Falha ao remover imagem.')
    } finally {
      setHeroBusy(false)
    }
  }

  async function clearFundo() {
    setFundoBusy(true)
    setFundoErr(null)
    try {
      const res = await fetch('/api/loja/assets?kind=provador_fundo', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data?.error?.message ?? 'Falha ao remover')
      setLoja(data.data as LojaRow)
      setFundoUrl(null)
    } catch (error) {
      setFundoErr(error instanceof Error ? error.message : 'Falha ao remover fundo.')
    } finally {
      setFundoBusy(false)
    }
  }

  async function removeLogo() {
    setLogoBusy(true)
    setLogoErr(null)
    try {
      const res = await fetch('/api/loja/assets?kind=logo', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data?.error?.message ?? 'Falha ao remover')
      setLoja(data.data as LojaRow)
      setLogoUrl(null)
    } catch (error) {
      setLogoErr(error instanceof Error ? error.message : 'Falha ao remover logo.')
    } finally {
      setLogoBusy(false)
    }
  }

  async function save() {
    setSaving(true)
    setErr(null)
    setSaved(false)
    const r = await fetch('/api/loja', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: loja.nome,
        tagline: loja.tagline ?? '',
        instagram: loja.instagram ?? '',
        tiktok: loja.tiktok ?? '',
        whatsapp_e164: loja.whatsapp_e164 ?? '',
        exibir_preco_publico: loja.exibir_preco_publico,
        vitrine_publica_visivel: loja.vitrine_publica_visivel,
        provador_fundo_tipo: loja.provador_fundo_tipo,
      }),
    })
    setSaving(false)
    const data = await r.json()
    if (!r.ok || !data.ok) {
      setErr(data?.error?.message ?? 'Falha ao salvar')
      return
    }
    setLoja(data.data as LojaRow)
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  function normalizeWhatsApp(value: string) {
    const compact = value.trim().replace(/\s+/g, '').replace(/[()-]/g, '')
    if (!compact) return ''
    return compact.startsWith('+') ? compact : `+${compact}`
  }

  return (
    <div className="p-4 sm:p-7 lg:p-9">
      <div className="max-w-[480px]">
        <Reveal>
          <h1 className="mb-7 font-serif text-[24px] font-semibold tracking-tight text-ink">
            Configurações
          </h1>
        </Reveal>

        {/* ── Identidade ── */}
        <Reveal delay={40}>
          <SectionLabel>Identidade</SectionLabel>
          <div className="mb-5 flex items-start gap-4">
            <button
              type="button"
              onClick={() => !logoBusy && logoInputRef.current?.click()}
              disabled={logoBusy}
              title={logoUrl ? 'Trocar logo' : 'Enviar logo'}
              aria-label="Enviar logo da loja"
              className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-[12px] border border-border bg-surface-2 transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-70"
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                  <ImageIcon size={18} className="text-ink-3" />
                  <span className="font-sans text-[9px] text-ink-3">Logo</span>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-ink/0 transition group-hover:bg-ink/30">
                <ImageIcon
                  size={16}
                  className="text-white opacity-0 transition group-hover:opacity-100"
                />
              </div>
              {logoBusy ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 font-sans text-[10px] text-ink-2">
                  Enviando…
                </div>
              ) : null}
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                e.target.value = ''
                handleLogoFile(file)
              }}
            />
            <div className="flex flex-1 flex-col gap-2">
              <Input
                label="Nome da loja"
                value={loja.nome}
                onChange={(e) => setLoja({ ...loja, nome: e.target.value })}
                maxLength={80}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoBusy}
                >
                  <Upload size={12} />
                  {logoUrl ? 'Trocar logo' : 'Enviar logo'}
                </Button>
                {logoUrl ? (
                  <Button
                    size="sm"
                    variant="text"
                    onClick={removeLogo}
                    disabled={logoBusy}
                    className="text-ink-3 hover:text-danger"
                  >
                    <Trash2 size={12} />
                    Remover
                  </Button>
                ) : null}
              </div>
              <p className="font-sans text-[11px] text-ink-2">PNG, JPG ou WebP · até 10 MB</p>
              {logoErr ? <p className="font-sans text-xs text-danger">{logoErr}</p> : null}
            </div>
          </div>
          <Input
            label="Tagline"
            value={loja.tagline ?? ''}
            onChange={(e) => setLoja({ ...loja, tagline: e.target.value })}
            placeholder="Uma frase curta que representa sua loja"
            helper={`${(loja.tagline ?? '').length}/140`}
            maxLength={140}
          />
        </Reveal>

        <div className="my-7 h-px bg-border" />

        {/* ── Contato & redes ── */}
        <Reveal delay={80}>
          <SectionLabel>Contato &amp; redes</SectionLabel>
          <div className="flex flex-col gap-3.5">
            <Input
              label="WhatsApp"
              value={loja.whatsapp_e164 ?? ''}
              onChange={(e) => setLoja({ ...loja, whatsapp_e164: e.target.value })}
              onBlur={(e) =>
                setLoja({ ...loja, whatsapp_e164: normalizeWhatsApp(e.target.value) })
              }
              placeholder="+5511998765432"
              helper="Número completo com código do país."
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Instagram"
                value={loja.instagram ?? ''}
                onChange={(e) => setLoja({ ...loja, instagram: e.target.value })}
                prefix="@"
                placeholder="atelierlaila"
              />
              <Input
                label="TikTok"
                value={loja.tiktok ?? ''}
                onChange={(e) => setLoja({ ...loja, tiktok: e.target.value })}
                prefix="@"
                placeholder="atelierlaila"
              />
            </div>
          </div>
        </Reveal>

        <div className="my-7 h-px bg-border" />

        {/* ── Vitrine ── */}
        <Reveal delay={120}>
          <SectionLabel>Vitrine</SectionLabel>
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-sans text-[13.5px] font-medium text-ink">
                  Vitrine visível para clientes
                </div>
                {/* P0-03 (v6): description sobe para ink-2 (5.8:1) — texto
                    explicativo de toggle não é decorativo, precisa AA. */}
                <div className="mt-0.5 font-sans text-xs text-ink-2">
                  Quando desativada, ninguém consegue abrir sua vitrine pública.
                </div>
              </div>
              <Toggle
                checked={loja.vitrine_publica_visivel}
                onCheckedChange={(v) => setLoja({ ...loja, vitrine_publica_visivel: v })}
                label="Vitrine visível"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-sans text-[13.5px] font-medium text-ink">
                  Mostrar preços
                </div>
                <div className="mt-0.5 font-sans text-xs text-ink-2">
                  Clientes verão o preço das peças publicamente.
                </div>
              </div>
              <Toggle
                checked={loja.exibir_preco_publico}
                onCheckedChange={(v) => setLoja({ ...loja, exibir_preco_publico: v })}
                label="Mostrar preço"
              />
            </div>
          </div>
        </Reveal>

        <div className="my-7 h-px bg-border" />

        {/* ── Provador (Cabine) ── */}
        <Reveal delay={160}>
          <SectionLabel>Provador virtual</SectionLabel>
          <p className="mb-3.5 font-sans text-xs text-ink-2">
            Escolha o fundo padrão das experimentações da Cabine.
          </p>
          <div className="mb-3 flex flex-wrap items-start gap-2.5">
            {/* Tile 1 — fundo branco */}
            <button
              type="button"
              onClick={() => setLoja({ ...loja, provador_fundo_tipo: 'branco' })}
              className="group flex flex-col items-center transition"
            >
              <div
                className={`relative flex h-[88px] w-[112px] items-center justify-center overflow-hidden rounded-[10px] border-2 bg-white transition ${
                  loja.provador_fundo_tipo === 'branco'
                    ? 'border-accent shadow-card-hover'
                    : 'border-border group-hover:border-border-2'
                }`}
              >
                <Silhueta />
                {loja.provador_fundo_tipo === 'branco' ? <SelectedDot /> : null}
              </div>
              <span
                className={`mt-2 font-sans text-xs ${
                  loja.provador_fundo_tipo === 'branco'
                    ? 'font-semibold text-ink'
                    : 'text-ink-2'
                }`}
              >
                Padrão branco
              </span>
            </button>

            {/* Tile 2 — Experiência da loja */}
            <button
              type="button"
              onClick={() => {
                if (fundoBusy) return
                if (fundoUrl) {
                  setLoja({ ...loja, provador_fundo_tipo: 'personalizado' })
                } else {
                  fundoInputRef.current?.click()
                }
              }}
              disabled={fundoBusy}
              className="group flex flex-col items-center transition disabled:cursor-not-allowed"
            >
              <div
                className={`relative flex h-[88px] w-[112px] items-center justify-center overflow-hidden rounded-[10px] border-2 bg-surface-2 transition ${
                  loja.provador_fundo_tipo === 'personalizado'
                    ? 'border-accent shadow-card-hover'
                    : 'border-border group-hover:border-border-2'
                }`}
              >
                {fundoBusy ? (
                  <div className="flex h-full w-full items-center justify-center bg-white/70 font-sans text-[10px] text-ink-2">
                    Enviando…
                  </div>
                ) : fundoUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fundoUrl} alt="Fundo" className="h-full w-full object-cover" />
                    {loja.provador_fundo_tipo === 'personalizado' ? <SelectedDot /> : null}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-ink-3">
                    <Upload size={18} />
                    <span className="font-sans text-[10px]">Enviar foto</span>
                  </div>
                )}
              </div>
              <span
                className={`mt-2 font-sans text-xs ${
                  loja.provador_fundo_tipo === 'personalizado'
                    ? 'font-semibold text-ink'
                    : 'text-ink-2'
                }`}
              >
                Experiência da loja
              </span>
            </button>

            {/* Tile 3 — Foto do cliente */}
            <button
              type="button"
              onClick={() => setLoja({ ...loja, provador_fundo_tipo: 'cliente' })}
              className="group flex flex-col items-center transition"
            >
              <div
                className={`relative flex h-[88px] w-[112px] items-center justify-center overflow-hidden rounded-[10px] border-2 bg-gradient-to-br from-[#f0ebe4] to-[#e2d9ce] transition ${
                  loja.provador_fundo_tipo === 'cliente'
                    ? 'border-accent shadow-card-hover'
                    : 'border-border group-hover:border-border-2'
                }`}
              >
                <Silhueta />
                {loja.provador_fundo_tipo === 'cliente' ? <SelectedDot /> : null}
              </div>
              <span
                className={`mt-2 font-sans text-xs ${
                  loja.provador_fundo_tipo === 'cliente'
                    ? 'font-semibold text-ink'
                    : 'text-ink-2'
                }`}
              >
                Foto do cliente
              </span>
            </button>

            {fundoUrl ? (
              <div className="flex flex-col gap-1.5 self-center pt-1">
                <button
                  type="button"
                  onClick={() => fundoInputRef.current?.click()}
                  disabled={fundoBusy}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-transparent px-2.5 py-1 font-sans text-[11.5px] text-ink-2 transition hover:border-accent hover:text-accent disabled:opacity-60"
                >
                  <RefreshCw size={11} />
                  Trocar
                </button>
                <button
                  type="button"
                  onClick={clearFundo}
                  disabled={fundoBusy}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 font-sans text-[11.5px] text-ink-3 transition hover:text-danger disabled:opacity-60"
                >
                  <Trash2 size={11} />
                  Remover
                </button>
              </div>
            ) : null}

            <input
              ref={fundoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                e.target.value = ''
                handleFundoFile(file)
              }}
            />
          </div>
          {fundoErr ? <p className="mb-3 font-sans text-xs text-danger">{fundoErr}</p> : null}
        </Reveal>

        <div className="my-7 h-px bg-border" />

        {/* ── Foto editorial do hero ── */}
        <Reveal delay={200}>
          <SectionLabel>Foto editorial da vitrine</SectionLabel>
          <p className="mb-3.5 font-sans text-xs text-ink-2">
            Imagem que aparece no destaque do hero da sua vitrine pública.
            Recomendado: foto vertical (proporção 4:5), 1080×1350px,
            iluminação editorial.
            {loja.vitrine_theme !== 'CasaGabyHarb' ? (
              <span className="mt-1 block text-[11px] italic text-ink-3">
                (Aplica em temas que honram esta configuração — hoje, apenas
                Casa Gaby Harb. Lojas no tema padrão exibem a foto da primeira
                peça.)
              </span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-start gap-3">
            <button
              type="button"
              onClick={() => {
                if (heroBusy) return
                if (!heroImageUrl) heroInputRef.current?.click()
              }}
              disabled={heroBusy}
              className="group flex flex-col items-center transition disabled:cursor-not-allowed"
            >
              <div
                className={`relative flex h-[150px] w-[120px] items-center justify-center overflow-hidden rounded-[10px] border-2 bg-surface-2 transition ${
                  heroImageUrl
                    ? 'border-accent shadow-card'
                    : 'border-dashed border-border group-hover:border-border-2'
                }`}
              >
                {heroBusy ? (
                  <div className="flex h-full w-full items-center justify-center bg-white/70 font-sans text-[10px] text-ink-2">
                    Enviando…
                  </div>
                ) : heroImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={heroImageUrl}
                    alt="Foto editorial"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-ink-3">
                    <ImageIcon size={20} />
                    <span className="font-sans text-[10.5px] uppercase tracking-wider">
                      Enviar foto
                    </span>
                  </div>
                )}
              </div>
              <span className="mt-2 font-sans text-xs text-ink-2">
                {heroImageUrl ? 'Foto fixa' : 'Sem foto'}
              </span>
            </button>

            {heroImageUrl ? (
              <div className="flex flex-col gap-1.5 self-center pt-1">
                <button
                  type="button"
                  onClick={() => heroInputRef.current?.click()}
                  disabled={heroBusy}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-transparent px-2.5 py-1 font-sans text-[11.5px] text-ink-2 transition hover:border-accent hover:text-accent disabled:opacity-60"
                >
                  <RefreshCw size={11} />
                  Trocar
                </button>
                <button
                  type="button"
                  onClick={clearHeroImage}
                  disabled={heroBusy}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 font-sans text-[11.5px] text-ink-3 transition hover:text-danger disabled:opacity-60"
                >
                  <Trash2 size={11} />
                  Remover
                </button>
              </div>
            ) : null}

            <input
              ref={heroInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                e.target.value = ''
                handleHeroFile(file)
              }}
            />
          </div>
          {heroErr ? <p className="mt-3 font-sans text-xs text-danger">{heroErr}</p> : null}
        </Reveal>

        <div className="mt-9 flex items-center gap-3">
          <Button variant="dark" onClick={save} disabled={saving}>
            {saving ? <Spinner size={14} className="text-white" /> : null}
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
          {saved ? (
            <span className="vv-fade-in inline-flex items-center gap-1 font-sans text-sm text-success">
              <Check size={14} />
              Salvo
            </span>
          ) : null}
          {err ? <span className="font-sans text-sm text-danger">{err}</span> : null}
        </div>
      </div>
    </div>
  )
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Falha ao converter imagem'))
        return
      }
      resolve(reader.result)
    }
    reader.onerror = () => reject(new Error('Falha ao ler imagem'))
    reader.readAsDataURL(file)
  })
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3.5 font-sans text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-3">
      {children}
    </div>
  )
}

function SelectedDot() {
  return (
    <div className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white">
      <Check size={9} />
    </div>
  )
}

function Silhueta() {
  return (
    <svg width="52" height="64" viewBox="0 0 52 64" fill="none" aria-hidden="true">
      <ellipse cx="26" cy="14" rx="9" ry="9" fill="#e8e2db" />
      <path d="M10 64 C10 44 16 36 26 34 C36 36 42 44 42 64Z" fill="#ede8e0" />
    </svg>
  )
}
