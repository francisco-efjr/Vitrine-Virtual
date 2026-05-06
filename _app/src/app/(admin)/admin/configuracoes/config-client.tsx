'use client'

import { useRef, useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import type { LojaRow } from '@/types/database'

export function ConfigClient({ initialLoja }: { initialLoja: LojaRow }) {
  const [loja, setLoja] = useState(initialLoja)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  // Local logo preview (before upload implementation)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  function handleLogoFile(file: File | null) {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setLogoPreview(url)
    // TODO: upload logo to storage and update loja.logo_storage_path
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
        instagram: loja.instagram ?? '',
        tiktok: loja.tiktok ?? '',
        whatsapp_e164: loja.whatsapp_e164 ?? '',
        exibir_preco_publico: loja.exibir_preco_publico,
      }),
    })
    setSaving(false)
    const data = await r.json()
    if (!r.ok || !data.ok) {
      setErr(data?.error?.message ?? 'Falha ao salvar')
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function normalizeWhatsApp(value: string) {
    const compact = value.trim().replace(/\s+/g, '').replace(/[()-]/g, '')
    if (!compact) return ''
    return compact.startsWith('+') ? compact : `+${compact}`
  }

  return (
    <div className="max-w-[600px] p-9">
      <h1 className="font-serif text-[26px] font-semibold text-ink">Configurações da loja</h1>
      <p className="mb-7 mt-2 text-sm text-ink-2">
        Personalize como sua vitrine aparece para os clientes.
      </p>

      {/* Identidade */}
      <Card className="mb-5 p-6">
        <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-2">
          Identidade
        </div>
        <div className="flex flex-col gap-4">
          {/* Logo + nome em linha */}
          <div className="flex items-center gap-4">
            {/* Logo tile 64×64 */}
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              title="Clique para enviar o logo"
              className="group relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border bg-surface-2 transition hover:border-accent"
              aria-label="Enviar logo da loja"
            >
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoPreview}
                  alt="Logo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                  <ImageIcon size={18} className="text-ink-3" />
                  <span className="text-[9px] text-ink-3">Logo</span>
                </div>
              )}
              {/* Hover overlay */}
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

            <div className="flex-1">
              <Input
                label="Nome da loja"
                value={loja.nome}
                onChange={(e) => setLoja({ ...loja, nome: e.target.value })}
                maxLength={80}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Contato & redes */}
      <Card className="mb-5 p-6">
        <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-2">
          Contato &amp; redes
        </div>
        <div className="flex flex-col gap-4">
          <Input
            label="WhatsApp"
            value={loja.whatsapp_e164 ?? ''}
            onChange={(e) => setLoja({ ...loja, whatsapp_e164: e.target.value })}
            onBlur={(e) => setLoja({ ...loja, whatsapp_e164: normalizeWhatsApp(e.target.value) })}
            placeholder="+5511998765432"
            helper="Número completo com código do país. Exemplo: +5511998765432"
          />
          <div className="grid grid-cols-2 gap-4">
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
      </Card>

      {/* Exibição */}
      <Card className="mb-6 p-6">
        <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-2">
          Exibição
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-ink">Mostrar preço na vitrine</div>
            <div className="mt-0.5 text-xs text-ink-3">
              Clientes verão o preço das peças publicamente
            </div>
          </div>
          <Toggle
            checked={loja.exibir_preco_publico}
            onCheckedChange={(v) => setLoja({ ...loja, exibir_preco_publico: v })}
            label="Mostrar preço na vitrine"
          />
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="dark" onClick={save} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </Button>
        {saved ? <span className="text-sm text-success">✓ Salvo com sucesso</span> : null}
        {err ? <span className="text-sm text-danger">{err}</span> : null}
      </div>
    </div>
  )
}
