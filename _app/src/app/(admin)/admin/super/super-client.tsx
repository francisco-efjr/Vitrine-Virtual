'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Toggle } from '@/components/ui/toggle'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { nomeToSlug } from '@/lib/validators/loja'
import type { LojaWithStats } from '@/server/lojas/list'

export function SuperAdminClient({
  initialLojas,
  initialKillEnabled,
  initialBudget,
}: {
  initialLojas: LojaWithStats[]
  initialKillEnabled: boolean
  initialBudget: number
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [lojas, setLojas] = useState(initialLojas)
  const [killEnabled, setKillEnabled] = useState(initialKillEnabled)
  const [budget, setBudget] = useState(String(initialBudget))
  const [createOpen, setCreateOpen] = useState(false)

  async function toggleLoja(id: string, ativa: boolean) {
    setLojas((prev) => prev.map((l) => (l.id === id ? { ...l, ativa } : l)))
    await fetch(`/api/super-admin/lojas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativa }),
    })
  }

  async function toggleKillSwitch(v: boolean) {
    setKillEnabled(v)
    await fetch('/api/super-admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ try_on_enabled: v }),
    })
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-widest text-ink-2">
          Lojas cadastradas
        </div>
        <Button variant="dark" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
          Nova loja + convite
        </Button>
      </div>

      <Card>
        {lojas.map((loja, i) => {
          const cotaPct = Math.round((loja.try_ons_mes / loja.cota_try_on_mensal) * 100)
          return (
            <div
              key={loja.id}
              className={`flex items-center gap-4 px-6 py-4 ${
                i < lojas.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{loja.nome}</span>
                  <Badge
                    label={loja.ativa ? 'ativa' : 'inativa'}
                    variant={loja.ativa ? 'disponivel' : 'vendida'}
                  />
                </div>
                <div className="mt-1 text-xs text-ink-3">
                  /v/{loja.slug} · criada em {new Date(loja.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <div className="text-center">
                <div className="font-serif text-xl font-semibold">{loja.pecas_count}</div>
                <div className="text-[11px] text-ink-3">peças</div>
              </div>
              <div className="text-center">
                <div className="font-serif text-xl font-semibold text-success">
                  {loja.vendidas_count}
                </div>
                <div className="text-[11px] text-ink-3">vendidas</div>
              </div>
              <div className="min-w-[120px]">
                <div className="mb-1 flex justify-between text-[11px] text-ink-3">
                  <span>Provador IA</span>
                  <span className={cotaPct > 80 ? 'text-danger' : ''}>
                    {loja.try_ons_mes}/{loja.cota_try_on_mensal}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className={`h-full ${cotaPct > 80 ? 'bg-danger' : 'bg-accent'}`}
                    style={{ width: `${Math.min(100, cotaPct)}%` }}
                  />
                </div>
              </div>
              <Toggle checked={loja.ativa} onCheckedChange={(v) => toggleLoja(loja.id, v)} />
            </div>
          )
        })}
        {lojas.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-3">
            Nenhuma loja cadastrada ainda. Clique em &ldquo;Nova loja + convite&rdquo;.
          </div>
        ) : null}
      </Card>

      {/* Configurações globais */}
      <Card className="mt-6 p-6">
        <div className="mb-5 text-xs font-semibold uppercase tracking-widest text-ink-2">
          Configurações globais do sistema
        </div>
        <div
          className={`mb-5 flex items-center justify-between gap-3 rounded-[10px] p-4 ${
            killEnabled ? 'bg-success-light' : 'bg-danger-light'
          }`}
        >
          <div>
            <div className="text-base font-semibold">Kill switch global — Provador IA</div>
            <div className="mt-1 text-xs text-ink-2">
              Desligar desativa o provador em <strong>todas</strong> as lojas imediatamente.
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge label={killEnabled ? 'ON' : 'OFF'} variant={killEnabled ? 'disponivel' : 'vendida'} />
            <Toggle checked={killEnabled} onCheckedChange={toggleKillSwitch} />
          </div>
        </div>
        <div className="flex items-end gap-3">
          <Input
            label="Orçamento mensal total de IA (US$)"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            type="number"
            prefix="US$"
            helper="Ao atingir o limite, o kill switch é ativado automaticamente."
            className="flex-1"
          />
          <Button variant="dark">Salvar</Button>
        </div>
      </Card>

      <CreateLojaModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false)
          startTransition(() => router.refresh())
        }}
      />
    </>
  )
}

function CreateLojaModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [slug, setSlug] = useState('')
  const [cota, setCota] = useState('200')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function handleNomeChange(v: string) {
    setNome(v)
    setSlug(nomeToSlug(v))
  }

  async function handleCreate() {
    setSaving(true)
    setErr(null)
    const r = await fetch('/api/super-admin/lojas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome,
        email,
        slug,
        cota_try_on_mensal: parseInt(cota, 10) || 200,
      }),
    })
    setSaving(false)
    const data = await r.json()
    if (!r.ok || !data.ok) {
      setErr(data?.error?.message ?? 'Falha ao criar loja')
      return
    }
    setDone(true)
    setTimeout(onCreated, 1500)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova loja"
      width={500}
      footer={
        !done ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="dark" onClick={handleCreate} disabled={!nome || !email || saving}>
              {saving ? <Spinner size={14} className="text-white" /> : null}
              {saving ? 'Criando...' : 'Criar loja + enviar convite'}
            </Button>
          </>
        ) : null
      }
    >
      {done ? (
        <div className="py-5 text-center">
          <div className="mb-3 text-4xl">✉️</div>
          <div className="font-serif text-xl font-semibold">Loja criada com sucesso!</div>
          <div className="mt-2 text-sm text-ink-2">
            Convite enviado para <strong>{email}</strong>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Input
            label="Nome da loja"
            value={nome}
            onChange={(e) => handleNomeChange(e.target.value)}
            placeholder="Ex: Atelier Laila"
          />
          <Input
            label="E-mail da lojista"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="lojista@email.com"
            helper="Um magic link será enviado automaticamente."
          />
          <Input
            label="Slug da vitrine"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            prefix="vitrine.app/v/"
            helper="Gerado automaticamente do nome, pode editar."
          />
          <Input
            label="Cota mensal de try-ons"
            value={cota}
            onChange={(e) => setCota(e.target.value)}
            type="number"
            suffix="usos/mês"
          />
          {err ? <p className="text-sm text-danger">{err}</p> : null}
        </div>
      )}
    </Modal>
  )
}
