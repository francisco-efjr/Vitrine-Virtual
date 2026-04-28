'use client'

import { useEffect, useRef, useState } from 'react'
import { FotoUploader, type ExistingFoto, type FotoUploaderHandle } from '@/components/admin/foto-uploader'
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
  const [existingFotos, setExistingFotos] = useState<ExistingFoto[]>([])
  const [loadingFotos, setLoadingFotos] = useState(false)
  const uploaderRef = useRef<FotoUploaderHandle>(null)

  useEffect(() => {
    if (!open) return

    setNome(peca?.nome ?? '')
    setPreco(centavosToPrecoString(peca?.preco_centavos))
    setTamanho(peca?.tamanho ?? '')
    setErr(null)
    setExistingFotos([])

    if (!peca?.id) return

    setLoadingFotos(true)
    fetch(`/api/pecas/${peca.id}/fotos`)
      .then((res) => res.json())
      .then((data) => {
        const fotos = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
        setExistingFotos(fotos as ExistingFoto[])
      })
      .catch(() => {
        setErr('Nao foi possivel carregar as fotos atuais da peca.')
      })
      .finally(() => setLoadingFotos(false))
  }, [open, peca])

  async function handleSave() {
    if (!nome.trim()) return
    setSaving(true)
    setErr(null)

    try {
      let precoCentavos: number | null = null
      try {
        precoCentavos = preco ? precoStringToCentavos(preco) : null
      } catch {
        setErr('Preco invalido')
        setSaving(false)
        return
      }

      const url = peca ? `/api/pecas/${peca.id}` : '/api/pecas'
      const method = peca ? 'PATCH' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          preco_centavos: precoCentavos,
          tamanho: tamanho.trim() || null,
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.ok) {
        setErr(data?.error?.message ?? 'Falha ao salvar peca')
        return
      }

      const savedPecaId = (data.data?.id ?? peca?.id) as string | undefined
      if (uploaderRef.current && savedPecaId) {
        try {
          await uploaderRef.current.flush(savedPecaId, peca?.foto_principal_id ?? null)
        } catch (fotoErr) {
          console.error('[PecaFormModal] Erro nas fotos:', fotoErr)
          setErr('Peca salva, mas houve um problema ao aplicar as fotos.')
          onSaved()
          return
        }
      }

      onSaved()
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Erro inesperado')
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
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="dark" onClick={handleSave} disabled={!nome.trim() || saving}>
            {saving ? <Spinner size={14} className="text-white" /> : null}
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Blazer de linho"
          disabled={saving}
        />

        <Input
          label="Preço"
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          placeholder="89,90"
          disabled={saving}
          inputMode="decimal"
          helper="Opcional. Aceita 89,90 ou 89.90."
        />

        <Input
          label="Tamanho"
          value={tamanho}
          onChange={(e) => setTamanho(e.target.value)}
          placeholder="Ex: P, M, 38"
          disabled={saving}
          helper="Opcional."
        />

        <div className="rounded-card border border-border bg-surface-2 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-ink">Fotos</div>
              <div className="text-xs text-ink-3">
                Adicione, remova e escolha a foto principal da peça.
              </div>
            </div>
            {loadingFotos ? <span className="text-xs text-ink-3">Carregando...</span> : null}
          </div>

          <FotoUploader
            ref={uploaderRef}
            pecaId={peca?.id ?? null}
            initialFotos={existingFotos}
            disabled={saving}
          />
        </div>

        {err ? <p className="text-sm text-danger">{err}</p> : null}
      </div>
    </Modal>
  )
}
