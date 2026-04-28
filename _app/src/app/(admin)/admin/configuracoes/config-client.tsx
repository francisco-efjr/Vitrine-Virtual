'use client'

import { useState } from 'react'
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

      <Card className="mb-5 p-6">
        <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-2">
          Identidade
        </div>
        <div className="flex flex-col gap-4">
          <Input
            label="Nome da loja"
            value={loja.nome}
            onChange={(e) => setLoja({ ...loja, nome: e.target.value })}
            maxLength={80}
          />
        </div>
      </Card>

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
            helper="Use o número completo com código do país. Exemplo: +5511998765432"
          />
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
      </Card>

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
