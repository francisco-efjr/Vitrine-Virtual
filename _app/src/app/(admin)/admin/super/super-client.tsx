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
import { LojaMark } from '@/components/brand/vv-logo'
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
  const [savingBudget, setSavingBudget] = useState(false)
  const [savedBudget, setSavedBudget] = useState(false)
  const [confirmKill, setConfirmKill] = useState<boolean | null>(null)

  async function toggleLoja(id: string, ativa: boolean) {
    const prev = lojas
    setLojas((l) => l.map((x) => (x.id === id ? { ...x, ativa } : x)))
    const r = await fetch(`/api/super-admin/lojas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativa }),
    })
    if (!r.ok) setLojas(prev)
  }

  async function applyKillSwitch(v: boolean) {
    setKillEnabled(v)
    await fetch('/api/super-admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ try_on_enabled: v }),
    })
  }

  function requestKillToggle(v: boolean) {
    // Pedir confirmação só quando desligando (afeta TODAS as lojas)
    if (!v) {
      setConfirmKill(false)
    } else {
      applyKillSwitch(true)
    }
  }

  async function saveBudget() {
    const parsed = parseFloat(budget)
    if (!Number.isFinite(parsed) || parsed <= 0) return
    setSavingBudget(true)
    const r = await fetch('/api/super-admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ try_on_monthly_budget_usd: parsed }),
    })
    setSavingBudget(false)
    if (r.ok) {
      setSavedBudget(true)
      setTimeout(() => setSavedBudget(false), 2000)
    }
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-3">
          Lojas
        </div>
        <Button variant="dark" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
          Nova loja + convite
        </Button>
      </div>

      <Card className="mb-6 overflow-hidden">
        {lojas.map((loja, i) => {
          const cotaPct = Math.round((loja.try_ons_mes / loja.cota_try_on_mensal) * 100)
          const lojaLite = {
            nome: loja.nome,
            logo_url: loja.logo_storage_path ? buildLojaPublicUrl(loja.logo_storage_path) : null,
          }
          return (
            <div key={loja.id}>
              <div className="flex flex-wrap items-center gap-3.5 px-5 py-3.5 sm:flex-nowrap sm:px-6">
                <LojaMark loja={lojaLite} size={38} radius={10} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-sans text-[13.5px] font-semibold text-ink">
                      {loja.nome}
                    </span>
                    <Badge
                      label={loja.ativa ? 'ativa' : 'inativa'}
                      variant={loja.ativa ? 'success' : 'neutral'}
                    />
                  </div>
                  <div className="mt-0.5 truncate font-sans text-[11.5px] text-ink-3">
                    /v/{loja.slug} · criada{' '}
                    {new Date(loja.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div className="hidden text-center sm:block">
                  <div className="font-serif text-[19px] font-semibold text-ink">
                    {loja.pecas_count}
                  </div>
                  <div className="font-sans text-[10.5px] text-ink-3">peças</div>
                </div>
                <div className="hidden text-center sm:block">
                  <div className="font-serif text-[19px] font-semibold text-accent">
                    {loja.vendidas_count}
                  </div>
                  <div className="font-sans text-[10.5px] text-ink-3">vendidas</div>
                </div>
                <div className="min-w-[110px] flex-1 sm:flex-initial">
                  <div className="mb-1 flex justify-between">
                    <span className="font-sans text-[10.5px] text-ink-3">Cabine</span>
                    <span
                      className={`font-sans text-[10.5px] ${cotaPct > 85 ? 'text-danger' : 'text-ink-3'}`}
                    >
                      {loja.try_ons_mes}/{loja.cota_try_on_mensal}
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-border">
                    <div
                      className={`h-full ${cotaPct > 85 ? 'bg-danger' : 'bg-accent'}`}
                      style={{ width: `${Math.min(100, cotaPct)}%` }}
                    />
                  </div>
                </div>
                <Toggle
                  checked={loja.ativa}
                  onCheckedChange={(v) => toggleLoja(loja.id, v)}
                  label={`Ativar ${loja.nome}`}
                />
              </div>
              {i < lojas.length - 1 ? <div className="mx-5 h-px bg-border sm:mx-6" /> : null}
            </div>
          )
        })}
        {lojas.length === 0 ? (
          <div className="p-10 text-center font-sans text-sm text-ink-3">
            Nenhuma loja cadastrada ainda. Clique em &ldquo;Nova loja + convite&rdquo;.
          </div>
        ) : null}
      </Card>

      {/* Controles do sistema */}
      <Card className="p-5 sm:p-6">
        <div className="mb-4 font-sans text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-3">
          Controles do sistema
        </div>
        <div className="flex flex-col gap-4">
          <div
            className={`flex flex-wrap items-center justify-between gap-3 rounded-[10px] p-4 ${
              killEnabled ? 'bg-accent-light' : 'bg-danger-light'
            }`}
          >
            <div>
              <div className="font-sans text-[14px] font-semibold text-ink">
                Kill switch — Cabine
              </div>
              <div className="mt-0.5 font-sans text-[12px] text-ink-2">
                Desligar suspende as simulações em{' '}
                <strong className="font-semibold">todas</strong> as vitrines.
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Badge
                label={killEnabled ? 'ON' : 'OFF'}
                variant={killEnabled ? 'success' : 'neutral'}
              />
              <Toggle
                checked={killEnabled}
                onCheckedChange={requestKillToggle}
                label="Kill switch"
              />
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 sm:flex-row sm:gap-3">
            <Input
              label="Orçamento mensal de API (US$)"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              type="number"
              prefix="US$"
              helper="Kill switch ativa automaticamente ao atingir o limite."
              className="flex-1"
            />
            <Button variant="dark" onClick={saveBudget} disabled={savingBudget}>
              {savingBudget ? <Spinner size={13} className="text-white" /> : null}
              {savingBudget ? 'Salvando…' : savedBudget ? '✓ Salvo' : 'Salvar'}
            </Button>
          </div>
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

      <Modal
        open={confirmKill !== null}
        onClose={() => setConfirmKill(null)}
        title="Desligar a Cabine em todas as lojas?"
        width={420}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmKill(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                applyKillSwitch(false)
                setConfirmKill(null)
              }}
            >
              Sim, desligar
            </Button>
          </>
        }
      >
        <p className="font-sans text-[13.5px] leading-relaxed text-ink-2">
          A Cabine será desativada imediatamente em{' '}
          <strong className="font-semibold text-ink">
            todas as {lojas.filter((l) => l.ativa).length} lojas ativas
          </strong>
          . Clientes não conseguirão experimentar peças até você reativar.
        </p>
      </Modal>
    </>
  )
}

function buildLojaPublicUrl(storagePath: string | null): string | null {
  if (!storagePath) return null
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')
  return `${base}/storage/v1/object/public/lojas-logos/${storagePath}`
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
              {saving ? 'Criando…' : 'Criar + enviar convite'}
            </Button>
          </>
        ) : null
      }
    >
      {done ? (
        <div className="py-4 text-center">
          <div className="mb-3 text-[36px]">✉️</div>
          <div className="font-serif text-[22px] font-semibold text-ink">Loja criada!</div>
          <div className="mt-2 font-sans text-[13.5px] text-ink-2">
            Convite enviado para <strong className="font-medium">{email}</strong>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
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
            helper="Magic link de acesso será enviado automaticamente"
          />
          <Input
            label="Slug da vitrine"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            prefix="vitrine.app/v/"
            helper="Gerado do nome — pode editar"
          />
          <Input
            label="Cota mensal"
            value={cota}
            onChange={(e) => setCota(e.target.value)}
            type="number"
            suffix="simulações/mês"
          />
          {err ? <p className="font-sans text-sm text-danger">{err}</p> : null}
        </div>
      )}
    </Modal>
  )
}
