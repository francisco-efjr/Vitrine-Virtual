'use client'

import { useEffect, useState } from 'react'
import { Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import {
  centavosToPrecoString,
  precoStringToCentavos,
} from '@/lib/validators/peca'
import type { PecaRow } from '@/types/database'

export function PecaFormModal({
  open,
  peca,
  onClose,
  onSaved,
}: {
  open: boolean
  peca: PecaRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const [nome, setNome] = useState('')
  const [preco, setPreco] = useState('')
  const [tamanho, setTamanho] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setNome(peca?.nome ?? '')
      setPreco(centavosToPrecoString(peca?.preco_centavos))
      setTamanho(peca?.tamanho ?? '')
      setErr(null)
    }
  }, [open, peca])

  async function handleSave() {
    setSaving(true)
    setErr(null)
    try {
      const preco_centavos = preco ? precoStringToCentavos(preco) : null
      const url = peca ? `/api/pecas/${peca.id}` : '/api/pecas'
      const method = peca ? 'PATCH' : 'POST'
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          preco_centavos,
          tamanho: tamanho.trim() || null,
        }),
      })
      const data = await r.json()
      if (!r.ok || !data.ok) {
        setErr(data?.error?.message ?? 'Falha ao salvar peça')
        return
      }
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={peca ? 'Editar peça' : 'Nova peça'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="dark" onClick={handleSave} disabled={!nome.trim() || saving}>
            {saving ? <Spinner size={14} className="text-white" /> : null}
            {saving ? 'Salvando...' : 'Salvar peça'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Nome da peça"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Blusa de linho branca"
          helper={`${nome.length}/100 caracteres`}
          maxLength={100}
        />
        <div className="flex gap-3.5">
          <Input
            label="Preço"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            prefix="R$"
            placeholder="89,90"
            inputMode="decimal"
            className="flex-1"
          />
          <Input
            label="Tamanho(s)"
            value={tamanho}
            onChange={(e) => setTamanho(e.target.value)}
            placeholder="P, M, G"
            className="flex-1"
          />
        </div>
        <div>
          <label className="mb-2 block text-[13px] font-medium text-ink-2">Fotos da peça</label>
          <div className="cursor-pointer rounded-[10px] border-2 border-dashed border-border bg-surface-2 p-7 text-center">
            <Camera size={28} className="mx-auto mb-2 text-ink-3" />
            <div className="mb-1 text-sm text-ink-2">Arraste fotos ou clique para selecionar</div>
            <div className="text-xs text-ink-3">JPEG, PNG ou WebP · Máx 5 MB · Até 8 fotos</div>
            {/* TODO: implementar upload via signed URL — POST /api/pecas/{id}/fotos */}
          </div>
        </div>
        {err ? <p className="text-sm text-danger">{err}</p> : null}
      </div>
    </Modal>
  )
}
