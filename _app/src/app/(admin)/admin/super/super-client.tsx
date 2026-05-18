'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Toggle } from '@/components/ui/toggle'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { LojaMark } from '@/components/brand/vv-logo'
import { AIModelToggle } from '@/components/admin/ai-model-toggle'
import {
  nomeToSlug,
  sanitizeSlug,
  trimSlugHyphens,
  validateSlug,
} from '@/lib/validators/loja'
import type { AiImageModel } from '@/types/database'
import type { LojaWithStats } from '@/server/lojas/list'

const PUBLIC_HOST = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '')

export function SuperAdminClient({
  initialLojas,
  initialKillEnabled,
  initialBudget,
  initialDefaultModel,
}: {
  initialLojas: LojaWithStats[]
  initialKillEnabled: boolean
  initialBudget: number
  initialDefaultModel: AiImageModel
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [lojas, setLojas] = useState(initialLojas)
  const [killEnabled, setKillEnabled] = useState(initialKillEnabled)
  const [budget, setBudget] = useState(String(initialBudget))
  const [defaultModel, setDefaultModel] = useState<AiImageModel>(initialDefaultModel)
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

  async function changeLojaModel(id: string, ai_image_model: AiImageModel) {
    const prev = lojas
    setLojas((l) => l.map((x) => (x.id === id ? { ...x, ai_image_model } : x)))
    const r = await fetch(`/api/super-admin/lojas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ai_image_model }),
    })
    if (!r.ok) setLojas(prev)
  }

  async function changeDefaultModel(v: AiImageModel) {
    const prev = defaultModel
    setDefaultModel(v)
    const r = await fetch('/api/super-admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ default_ai_image_model: v }),
    })
    if (!r.ok) setDefaultModel(prev)
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
    if (!v) setConfirmKill(false)
    else applyKillSwitch(true)
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
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2.5">
        <div>
          <h2 className="font-serif text-[20px] font-semibold tracking-tight text-ink">
            Lojas
          </h2>
          <p className="mt-0.5 font-sans text-[12.5px] text-ink-3">
            {lojas.length} cadastradas · escolha o modelo de imagem de cada vitrine
            individualmente
          </p>
        </div>
        <Button variant="dark" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
          Nova loja + convite
        </Button>
      </div>

      <Card className="mb-6 overflow-hidden">
        {lojas.length > 0 ? (
          <div className="hidden items-center gap-3.5 border-b border-border bg-bg px-5 py-2.5 sm:flex sm:px-6">
            <div className="w-[38px] shrink-0" />
            <div className="min-w-0 flex-1 font-sans text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-3">
              Loja
            </div>
            <ColHead className="min-w-[44px]">Peças</ColHead>
            <ColHead className="min-w-[44px]">Vend.</ColHead>
            <ColHead className="min-w-[52px]">Contatos</ColHead>
            <ColHead className="min-w-[100px]">Simulações</ColHead>
            <ColHead className="min-w-[128px]">Modelo IA</ColHead>
            <div className="min-w-[104px] shrink-0" />
          </div>
        ) : null}

        {lojas.map((loja, i) => {
          const cotaPct = Math.round((loja.try_ons_mes / loja.cota_try_on_mensal) * 100)
          const totalContatos =
            loja.contatos.instagram + loja.contatos.tiktok + loja.contatos.whatsapp
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
                  <div className="mt-0.5 truncate font-mono text-[11px] text-ink-3">
                    {PUBLIC_HOST}/v/{loja.slug}
                  </div>
                </div>
                <Stat className="min-w-[44px]" value={loja.pecas_count} label="peças" />
                <Stat
                  className="min-w-[44px]"
                  value={loja.vendidas_count}
                  label="vendidas"
                  accent
                />
                <Stat
                  className="min-w-[52px]"
                  value={totalContatos}
                  label="contatos"
                />
                <div className="min-w-[100px] flex-1 sm:flex-initial">
                  <div className="mb-1 flex justify-between">
                    <span className="font-sans text-[10.5px] text-ink-3">Cabine</span>
                    <span
                      className={`font-sans text-[10.5px] tabular-nums ${
                        cotaPct > 85 ? 'text-danger' : 'text-ink-3'
                      }`}
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
                <AIModelToggle
                  value={loja.ai_image_model}
                  onChange={(v) => changeLojaModel(loja.id, v)}
                  size="sm"
                />
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

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[10px] bg-surface-2 p-4">
            <div className="min-w-0 flex-1">
              <div className="font-sans text-[14px] font-semibold text-ink">
                Modelo de imagem padrão
              </div>
              <div className="mt-0.5 font-sans text-[12px] text-ink-2">
                Aplicado a novas lojas. Cada loja pode ser ajustada individualmente na tabela
                acima.
              </div>
            </div>
            <AIModelToggle value={defaultModel} onChange={changeDefaultModel} />
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
        defaultModel={defaultModel}
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

function ColHead({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`text-center font-sans text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-3 ${className ?? ''}`}
    >
      {children}
    </div>
  )
}

function Stat({
  value,
  label,
  className,
  accent,
}: {
  value: number
  label: string
  className?: string
  accent?: boolean
}) {
  return (
    <div className={`hidden text-center sm:block ${className ?? ''}`}>
      <div
        className={`font-serif text-[17px] font-semibold tabular-nums ${
          accent ? 'text-accent' : 'text-ink'
        }`}
      >
        {value}
      </div>
      <div className="font-sans text-[10.5px] text-ink-3">{label}</div>
    </div>
  )
}

function buildLojaPublicUrl(storagePath: string | null): string | null {
  if (!storagePath) return null
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')
  return `${base}/storage/v1/object/public/lojas-logos/${storagePath}`
}

function CreateLojaModal({
  open,
  defaultModel,
  onClose,
  onCreated,
}: {
  open: boolean
  defaultModel: AiImageModel
  onClose: () => void
  onCreated: () => void
}) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [cota, setCota] = useState('200')
  const [aiModel, setAiModel] = useState<AiImageModel>(defaultModel)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const slugInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setNome('')
      setEmail('')
      setSlug('')
      setSlugTouched(false)
      setCota('200')
      setAiModel(defaultModel)
      setDone(false)
      setErr(null)
    }
  }, [open, defaultModel])

  // Auto-deriva o slug do nome SOMENTE enquanto o usuário não tocou no campo
  // de slug. É exatamente isso que corrige o bug: antes, cada tecla no nome
  // sobrescrevia o slug que o usuário estava digitando.
  function handleNomeChange(v: string) {
    setNome(v)
    if (!slugTouched) setSlug(nomeToSlug(v))
  }
  function handleSlugChange(v: string) {
    setSlugTouched(true)
    setSlug(sanitizeSlug(v)) // sanitiza por tecla — nunca entra em estado quebrado
  }
  function handleSlugBlur() {
    setSlug((s) => trimSlugHyphens(s))
  }
  function resetSlugFromName() {
    setSlug(nomeToSlug(nome))
    setSlugTouched(false)
    setTimeout(() => slugInputRef.current?.focus(), 10)
  }

  const slugV = validateSlug(slug)
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const nomeValid = nome.trim().length >= 2
  const canSubmit = nomeValid && emailValid && slugV.ok && !saving

  async function handleCreate() {
    setSaving(true)
    setErr(null)
    const r = await fetch('/api/super-admin/lojas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: nome.trim(),
        email,
        slug: trimSlugHyphens(slug),
        cota_try_on_mensal: parseInt(cota, 10) || 200,
        ai_image_model: aiModel,
      }),
    })
    setSaving(false)
    const data = await r.json().catch(() => null)
    if (!r.ok || !data?.ok) {
      setErr(data?.error?.message ?? 'Falha ao criar loja')
      return
    }
    setDone(true)
    setTimeout(onCreated, 1600)
  }

  const slugBorder =
    slug && !slugV.ok ? 'border-danger' : slug && slugV.ok ? 'border-[#9bb89b]' : 'border-border'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova loja"
      width={540}
      footer={
        !done ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="dark" onClick={handleCreate} disabled={!canSubmit}>
              {saving ? <Spinner size={14} className="text-white" /> : null}
              {saving ? 'Criando…' : 'Criar loja + enviar convite'}
            </Button>
          </>
        ) : null
      }
    >
      {done ? (
        <div className="px-1 py-2 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
            <Check size={22} className="text-ink" />
          </div>
          <div className="font-serif text-[22px] font-semibold text-ink">Loja criada</div>
          <div className="mt-1.5 font-sans text-[13.5px] text-ink-2">
            Convite enviado para <strong className="font-semibold">{email}</strong>
          </div>
          <div className="mt-3.5 inline-flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 font-mono text-[12px] text-ink-2">
            {PUBLIC_HOST}/v/{trimSlugHyphens(slug)}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-[22px]">
          {/* Seção — Dados da loja */}
          <div>
            <div className="mb-3.5 font-sans text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-3">
              Dados da loja
            </div>
            <div className="flex flex-col gap-3.5">
              <Input
                label="Nome da loja"
                value={nome}
                onChange={(e) => handleNomeChange(e.target.value)}
                placeholder="Ex: Studio Manu"
              />
              <Input
                label="E-mail da lojista"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="lojista@email.com"
                helper="Um magic link de primeiro acesso será enviado automaticamente."
              />
            </div>
          </div>

          {/* Seção — URL da vitrine (input estável + preview ao vivo) */}
          <div>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <label
                htmlFor="loja-slug"
                className="font-sans text-[13px] font-medium text-ink-2"
              >
                URL da vitrine <span className="text-danger">*</span>
              </label>
              {slugTouched && nome && slug !== nomeToSlug(nome) && nomeToSlug(nome) ? (
                <button
                  type="button"
                  onClick={resetSlugFromName}
                  className="font-sans text-[11.5px] text-ink-2 underline decoration-border underline-offset-2"
                >
                  Usar nome da loja
                </button>
              ) : null}
            </div>
            <div
              className={`flex items-stretch overflow-hidden rounded-[9px] border-[1.5px] bg-surface transition-colors ${slugBorder}`}
            >
              <div className="flex select-none items-center whitespace-nowrap border-r border-border bg-surface-2 px-3.5 font-mono text-[13px] text-ink-3">
                {PUBLIC_HOST}/v/
              </div>
              <input
                id="loja-slug"
                ref={slugInputRef}
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                onBlur={handleSlugBlur}
                placeholder="studio-manu"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-[13.5px] text-ink outline-none"
              />
              {slug && slugV.ok ? (
                <div className="flex items-center px-3 text-[#4a8b58]">
                  <Check size={15} />
                </div>
              ) : null}
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2">
              <span className="font-sans text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                Pré-visualização
              </span>
              <span
                className={`font-mono text-[12.5px] ${slug && slugV.ok ? 'text-ink' : 'text-ink-3'}`}
              >
                {PUBLIC_HOST}/v/
                <span className="font-medium text-ink">{slug || 'sua-loja'}</span>
              </span>
            </div>
            <div
              className={`mt-1.5 min-h-[16px] font-sans text-[11.5px] leading-snug ${
                slug && !slugV.ok ? 'text-danger' : 'text-ink-3'
              }`}
            >
              {slug && !slugV.ok
                ? slugV.msg
                : 'A URL define como a vitrine aparece publicamente. Use apenas letras minúsculas, números e hífens.'}
            </div>
          </div>

          {/* Seção — Plataforma */}
          <div>
            <div className="mb-3.5 font-sans text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-3">
              Plataforma
            </div>
            <div className="flex flex-wrap items-end gap-3.5">
              <Input
                label="Cota mensal de simulações"
                value={cota}
                onChange={(e) => setCota(e.target.value)}
                type="number"
                suffix="/ mês"
                className="min-w-[170px] flex-1"
              />
              <div className="min-w-[170px] flex-1">
                <label className="mb-1.5 block font-sans text-[13px] font-medium text-ink-2">
                  Modelo de imagem
                </label>
                <AIModelToggle value={aiModel} onChange={setAiModel} />
              </div>
            </div>
          </div>

          {err ? <p className="font-sans text-sm text-danger">{err}</p> : null}
        </div>
      )}
    </Modal>
  )
}
