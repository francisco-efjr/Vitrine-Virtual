'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { FotoUploader, type ExistingFoto, type FotoUploaderHandle } from '@/components/admin/foto-uploader'
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

  // Fotos existentes carregadas da API ao editar
  const [existingFotos, setExistingFotos] = useState<ExistingFoto[]>([])
  const [loadingFotos, setLoadingFotos] = useState(false)

  const uploaderRef = useRef<FotoUploaderHandle>(null)

  // Reset e carregamento ao abrir
  useEffect(() => {
    if (!open) return
    setNome(peca?.nome ?? '')
    setPreco(centavosToPrecoString(peca?.preco_centavos))
    setTamanho(peca?.tamanho ?? '')
    setErr(null)
    setExistingFotos([])

    if (peca?.id) {
      setLoadingFotos(true)
      fetch(`/api/pecas/${peca.id}/fotos`)
        .then((r) => r.json())
        .then((data) => {
          const fotos = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
          setExistingFotos(fotos as ExistingFoto[])
        })
        .catch(() => {/* fotos não-críticas */})
        .finally(() => setLoadingFotos(false))
    }
  }, [open, peca])

  async function handleSave() {
    if (!nome.trim()) return
    setSaving(true)
    setErr(null)

    try {
      // 1. Salva metadados (cria ou edita)
      let preco_centavos: number | null = null
      try {
        preco_centavos = preco ? precoStringToCentavos(preco) : null
      } catch {
        setErr('Preço inválido')
        setSaving(false)
        return
      }

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

      // 2. Flush de fotos (deletes + uploads + set_principal)
      const savedPecaId: string = data.data?.id ?? peca?.id
      if (uploaderRef.current && savedPecaId) {
        try {
          await uploaderRef.current.flush(savedPecaId, peca?.foto_principal_id ?? null)
        } catch (fotoErr) {
          console.error('[PecaFormModal] Erro nas fotos:', fotoErr)
          // Peça salva, fotos podem estar parcialmente aplicadas — avisa e continua
          setErr('Peça salva! Porém houve um problema com as fotos — verifique e tente novamente.')
          onSaved()
          return
        }
      }

      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro inesperado')
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
            {saving ? <Spinner size={14} className="text-white" /> : null