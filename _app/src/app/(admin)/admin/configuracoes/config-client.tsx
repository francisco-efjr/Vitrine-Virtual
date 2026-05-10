'use client'

import { useRef, useState } from 'react'
import { Check, ImageIcon, RefreshCw, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import { Reveal } from '@/components/motion'
import type { LojaRow } from '@/types/database'

export function ConfigClient({ initialLoja }: { initialLoja: LojaRow }) {
  const [loja, setLoja] = useState(initialLoja)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  // Local logo preview (upload da logo ainda em TODO)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [fundoPreview, setFundoPreview] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const fundoInputRef = useRef<HTMLInputElement>(null)

  function handleLogoFile(file: File | null) {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setLogoPreview(url)
    // TODO: upload logo to storage e atualizar loja.logo_storage_path
  }

  function handleFundoFile(file: File | null) {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setFundoPreview(url)
    setLoja((prev) => ({ ...prev, provador_fundo_tipo: 'personalizado' }))
    // TODO: upload da imagem para o bucket lojas-logos e setar provador_fundo_storage_path
  }

  function clearFundo() {
    setFundoPreview(null)
    setLoja((prev) => ({
      ...prev,
      provador_fundo_tipo: 'branco',
      provador_fundo_storage_path: null,
    }))
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
              onClick={() => logoInputRef.current?.click()}
              title="Clique para enviar o logo"
              className="group relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border bg-surface-2 transition hover:border-accent"
              aria-label="Enviar logo da loja"
            >
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                  <ImageIcon size={18} className="text-ink-3" />
                  <span className="text-[9px] text-ink-3">Logo</span>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-ink/0 transition group-hover:bg-ink/25">
                <ImageIcon size={14} className="text-white opacity-0 transition group-hover:opacity-100" />
              </div>
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => handleLogoFile(e.target.files?.[0] ?? null)}
            />

            <div className="flex flex-1 flex-col gap-3">
              <Input
                label="Nome da loja"
                value={loja.nome}
                onChange={(e) => setLoja({ ...loja, nome: e.target.value })}
                maxLength={80}
              />
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
              if (fundoPreview) {
                setLoja({ ...loja, provador_fundo_tipo: 'personalizado' })
              } else {
                fundoInputRef.current?.click()
              }
            }}
            className={`group flex flex-col items-center transition ${
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
              {fundoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fundoPreview} alt="Fundo" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-ink-3">
                  <Upload size={18} />
                  <span className="text-[10px]">Enviar foto</span>
                </div>
              )}
              {loja.provador_fundo_tipo === 'personalizado' && fundoPreview ? <SelectedDot /> : null}
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

          {fundoPreview ? (
            <div className="flex flex-col gap-2 self-center">
              <button
                type="button"
                onClick={() => fundoInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[11.5px] text-ink-2 transition hover:border-accent hover:text-accent"
              >
                <RefreshCw size={11} />
                Trocar
              </button>
              <button
                type="button"
                onClick={clearFundo}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11.5px] text-ink-3 transition hover:text-danger"
              >
                <Trash2 size={11} />
                Remover
              </button>
            </div>
          ) : null}

          <input
            ref={fundoInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => handleFundoFile(e.target.files?.[0] ?? null)}
          />
        </div>
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
