'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ImageIcon, RefreshCw, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import { Reveal } from '@/components/motion'
import { preparePreviewableImage } from '@/lib/images/client-standardize'
import { IMAGE_INVALID_FORMAT_MESSAGE } from '@/lib/images/upload'
import type { LojaRow } from '@/types/database'

interface ConfigClientProps {
  initialLoja: LojaRow
  initialLogoUrl: string | null
  initialFundoUrl: string | null
}

export function ConfigClient({
  initialLoja,
  initialLogoUrl,
  initialFundoUrl,
}: ConfigClientProps) {
  const [loja, setLoja] = useState(initialLoja)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl)
  const [fundoUrl, setFundoUrl] = useState<string | null>(initialFundoUrl)
  const [logoBusy, setLogoBusy] = useState(false)
  const [fundoBusy, setFundoBusy] = useState(false)
  const [logoErr, setLogoErr] = useState<string | null>(null)
  const [fundoErr, setFundoErr] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const fundoInputRef = useRef<HTMLInputElement>(null)

  // Limpa qualquer blob: que tenhamos criado para o preview otimista
  useEffect(() => {
    return () => {
      if (logoUrl?.startsWith('blob:')) URL.revokeObjectURL(logoUrl)
      if (fundoUrl?.startsWith('blob:')) URL.revokeObjectURL(fundoUrl)
    }
  }, [logoUrl, fundoUrl])

  async function uploadAsset(
    file: File,
    kind: 'logo' | 'provador_fundo',
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
      setLogoErr(
        error instanceof Error ? error.message : IMAGE_INVALID_FORMAT_MESSAGE,
      )
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
      setFundoErr(
        error instanceof Error ? error.message : IMAGE_INVALID_FORMAT_MESSAGE,
      )
    } finally {
      setFundoBusy(false)
    }
  }

  async function clearFundo() {
    setFundoBusy(true)
    setFundoErr(null)
    try {
      const res = await fetch('/api/loja/assets?kind=provador_fundo', {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data?.error?.message ?? 'Falha ao remover')
      }
      setLoja(data.data as LojaRow)
      setFundoUrl(null)
    } catch (error) {
      setFundoErr(
        error instanceof Error ? error.message : 'Falha ao remover fundo.',
      )
    } finally {
      setFundoBusy(false)
    }
  }

  async function removeLogo() {
    setLogoBusy(true)
    setLogoErr(null)
    try {
      const res = await fetch('/api/loja/assets?kind=logo', {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data?.error?.message ?? 'Falha ao remover')
      }
      setLoja(data.data as LojaRow)
      setLogoUrl(null)
    } catch (error) {
      setLogoErr(
        error instanceof Error ? error.message : 'Falha ao remover logo.',
      )
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
    <div className="max-w-[640px] p-4 sm:p-6 lg:p-9">
      <Reveal>
        <h1 className="font-serif text-[26px] font-semibold text-ink">Configurações</h1>
        <p className="mb-7 mt-2 text-sm text-ink-2">
          Personalize como sua vitrine aparece para os clientes.
        </p>
      </Reveal>

      {/* ── Identidade ── */}
      <Reveal delay={40}>
        <SectionLabel>Identidade</SectionLabel>
        <div className="mb-7 flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => !logoBusy && logoInputRef.current?.click()}
              disabled={logoBusy}
              title={logoUrl ? 'Clique para trocar o logo' : 'Clique para enviar o logo'}
              className="group relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border bg-surface-2 transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-70"
              aria-label="Enviar logo da loja"
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                  <ImageIcon size={18} className="text-ink-3" />
                  <span className="text-[9px] text-ink-3">Logo</span>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-ink/0 transition group-hover:bg-ink/25">
                <ImageIcon
                  size={14}
                  className="text-white opacity-0 transition group-hover:opacity-100"
                />
              </div>
              {logoBusy ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-[10px] text-ink-2">
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

            <div className="flex flex-1 flex-col gap-3">
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
                <div className="text-[11px] text-ink-3">
                  PNG, JPG ou WEBP · até 10 MB
                </div>
              </div>
              {logoErr ? <p className="text-xs text-danger">{logoErr}</p> : null}
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
        </div>
      </Reveal>

      <div className="mb-7 h-px bg-border" />

      {/* ── Contato & redes ── */}
      <Reveal delay={80}>
        <SectionLabel>Contato &amp; redes</SectionLabel>
        <div className="mb-7 flex flex-col gap-4">
          <Input
            label="WhatsApp"
            value={loja.whatsapp_e164 ?? ''}
            onChange={(e) => setLoja({ ...loja, whatsapp_e164: e.target.value })}
            onBlur={(e) => setLoja({ ...loja, whatsapp_e164: normalizeWhatsApp(e.target.value) })}
            placeholder="+5511998765432"
            helper="Número completo com código do país."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      <div className="mb-7 h-px bg-border" />

      {/* ── Vitrine ── */}
      <Reveal delay={120}>
        <SectionLabel>Vitrine</SectionLabel>
        <div className="mb-7 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-ink">Vitrine visível para clientes</div>
              <div className="mt-0.5 text-xs text-ink-3">
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
              <div className="text-sm font-medium text-ink">Mostrar preço na vitrine</div>
              <div className="mt-0.5 text-xs text-ink-3">
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

      <div className="mb-7 h-px bg-border" />

      {/* ── Provador (Cabine) ── */}
      <Reveal delay={160}>
        <SectionLabel>Cabine — fundo</SectionLabel>
        <p className="mb-3 text-xs text-ink-3">
          Escolha o fundo padrão das experimentações da sua vitrine.
        </p>
        <div className="mb-7 flex flex-wrap items-start gap-3">
          {/* Tile 1 — fundo branco */}
          <button
            type="button"
            onClick={() => setLoja({ ...loja, provador_fundo_tipo: 'branco' })}
            className={`group flex flex-col items-center transition ${
              loja.provador_fundo_tipo === 'branco' ? '' : 'opacity-90'
            }`}
          >
            <div
              className={`relative h-24 w-32 overflow-hidden rounded-xl border-2 bg-white transition ${
                loja.provador_fundo_tipo === 'branco'
                  ? 'border-accent shadow-card-hover'
                  : 'border-border group-hover:border-border-2'
              }`}
            >
              <SilhuetaIlustracao />
              {loja.provador_fundo_tipo === 'branco' ? <SelectedDot /> : null}
            </div>
            <span
              className={`mt-2 text-xs ${
                loja.provador_fundo_tipo === 'branco' ? 'font-semibold text-ink' : 'text-ink-2'
              }`}
            >
              Padrão branco
            </span>
          </button>

          {/* Tile 2 — fundo da loja */}
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
            className={`group flex flex-col items-center transition disabled:cursor-not-allowed ${
              loja.provador_fundo_tipo === 'personalizado' ? '' : 'opacity-90'
            }`}
          >
            <div
              className={`relative flex h-24 w-32 items-center justify-center overflow-hidden rounded-xl border-2 bg-surface-2 transition ${
                loja.provador_fundo_tipo === 'personalizado'
                  ? 'border-accent shadow-card-hover'
                  : 'border-border group-hover:border-border-2'
              }`}
            >
              {fundoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fundoUrl} alt="Fundo" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-ink-3">
                  <Upload size={18} />
                  <span className="text-[10px]">Enviar foto</span>
                </div>
              )}
              {loja.provador_fundo_tipo === 'personalizado' && fundoUrl ? <SelectedDot /> : null}
              {fundoBusy ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-[10px] text-ink-2">
                  Enviando…
                </div>
              ) : null}
            </div>
            <span
              className={`mt-2 text-xs ${
                loja.provador_fundo_tipo === 'personalizado'
                  ? 'font-semibold text-ink'
                  : 'text-ink-2'
              }`}
            >
              Experiência da loja
            </span>
          </button>

          {fundoUrl ? (
            <div className="flex flex-col gap-2 self-center">
              <button
                type="button"
                onClick={() => fundoInputRef.current?.click()}
                disabled={fundoBusy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[11.5px] text-ink-2 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={11} />
                Trocar
              </button>
              <button
                type="button"
                onClick={clearFundo}
                disabled={fundoBusy}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11.5px] text-ink-3 transition hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
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
        {fundoErr ? <p className="mb-3 text-xs text-danger">{fundoErr}</p> : null}
      </Reveal>

      <div className="flex items-center gap-3">
        <Button variant="dark" onClick={save} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </Button>
        {saved ? (
          <span className="vv-fade-in inline-flex items-center gap-1 text-sm text-success">
            <Check size={14} />
            Salvo
          </span>
        ) : null}
        {err ? <span className="text-sm text-danger">{err}</span> : null}
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
    <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-3">
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

function SilhuetaIlustracao() {
  return (
    <svg
      width="52"
      height="64"
      viewBox="0 0 52 64"
      fill="none"
      className="absolute inset-0 m-auto"
      aria-hidden="true"
    >
      <ellipse cx="26" cy="14" rx="9" ry="9" fill="#e8e2db" />
      <path d="M10 64 C10 44 16 36 26 34 C36 36 42 44 42 64Z" fill="#ede8e0" />
    </svg>
  )
}
