'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Camera, Star, Trash2, Upload } from 'lucide-react'
import { preparePreviewableImage } from '@/lib/images/client-standardize'
import { IMAGE_INVALID_FORMAT_MESSAGE, IMAGE_MAX_UPLOAD_BYTES } from '@/lib/images/upload'

// =============================================================================
// Types
// =============================================================================

export interface ExistingFoto {
  id: string
  storage_path: string
  ordem: number
  signed_url: string | null
  is_principal: boolean
}

interface PendingFoto {
  tempId: string
  file: File
  preview: string // blob URL — revogar no unmount
  isPrincipal: boolean
}

export interface FotoUploaderHandle {
  /**
   * Executa todas as operações pendentes:
   *   1. Delete fotos marcadas para remoção
   *   2. Upload de fotos novas em base64 via API da aplicação
   *   3. Atualiza foto principal se mudou
   *
   * Deve ser chamado APÓS salvar os metadados da peça (para ter o pecaId).
   */
  flush(pecaId: string, currentPrincipalId: string | null): Promise<void>
}

// =============================================================================
// FotoUploader
// =============================================================================

const MAX_FOTOS = 8

export const FotoUploader = forwardRef<
  FotoUploaderHandle,
  {
    pecaId: string | null
    /** Fotos já existentes no banco, com signed URLs. Obtidas via GET /api/pecas/{id}/fotos */
    initialFotos?: ExistingFoto[]
    disabled?: boolean
  }
>(function FotoUploader({ pecaId, initialFotos = [], disabled = false }, ref) {
  const [existing, setExisting] = useState<(ExistingFoto & { toDelete: boolean })[]>(() =>
    initialFotos.map((f) => ({ ...f, toDelete: false })),
  )
  const [pending, setPending] = useState<PendingFoto[]>([])
  const [dragging, setDragging] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  // Identifica a peça atualmente associada ao uploader. Quando o pai
  // troca de peça (abrir outra "Editar" sem fechar o modal antes), zera
  // pending; mas atualizações de initialFotos para a MESMA peça não
  // apagam o que o usuário já adicionou.
  const trackedPecaIdRef = useRef<string | null>(pecaId)

  // Carregar fotos quando pecaId muda (modo edição)
  useEffect(() => {
    if (!pecaId || initialFotos.length > 0) return
    fetch(`/api/pecas/${pecaId}/fotos`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok === false) return
        const fotos = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
        setExisting(fotos.map((f: ExistingFoto) => ({ ...f, toDelete: false })))
      })
      .catch(() => {/* silencia — não bloqueia o fluxo */})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pecaId])

  // Sincroniza quando o pai entrega novas initialFotos. Importante:
  //   • se a PEÇA mudou → reset completo (existing + pending + errors).
  //   • se a peça é a mesma → só atualiza `existing`. O pending do usuário
  //     fica preservado mesmo que o fetch inicial das fotos chegue depois
  //     dele já ter arrastado uma foto nova (regressão observada no QA:
  //     "ao atualizar/inserir peça nova, foto somia").
  useEffect(() => {
    const pecaChanged = trackedPecaIdRef.current !== pecaId
    trackedPecaIdRef.current = pecaId
    setExisting(initialFotos.map((f) => ({ ...f, toDelete: false })))
    if (pecaChanged) {
      setPending([])
      setErrors([])
    }
  }, [initialFotos, pecaId])

  // Revoga blob URLs ao desmontar
  useEffect(() => {
    return () => {
      pending.forEach((p) => URL.revokeObjectURL(p.preview))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Imperativo: flush é chamado pelo pai no momento do save ----
  useImperativeHandle(ref, () => ({
    async flush(targetPecaId: string, currentPrincipalId: string | null): Promise<void> {
      const tasks: Promise<void>[] = []

      // 1. Deletar fotos marcadas
      const toDelete = existing.filter((f) => f.toDelete)
      for (const foto of toDelete) {
        tasks.push(
          fetch(`/api/pecas/${targetPecaId}/fotos?foto_id=${foto.id}`, { method: 'DELETE' })
            .then(() => {/* void */}),
        )
      }
      await Promise.all(tasks)
      tasks.length = 0

      // 2. Upload de fotos novas
      const remaining = existing.filter((f) => !f.toDelete)
      const startOrdem = remaining.length
      let uploadedPendingPrincipalId: string | null = null

      for (let i = 0; i < pending.length; i++) {
        const pf = pending[i]
        if (!pf) continue
        const uploaded = await uploadFoto(targetPecaId, pf.file, startOrdem + i)
        if (pf.isPrincipal) {
          uploadedPendingPrincipalId = uploaded.id
        }
      }

      // 3. Ajustar foto principal
      const newPrincipalExisting = existing.find((f) => !f.toDelete && f.is_principal)
      const newPrincipalPending = pending.find((p) => p.isPrincipal)

      // Se o principal mudou para um existente diferente do atual, atualiza
      if (
        newPrincipalExisting &&
        newPrincipalExisting.id !== currentPrincipalId &&
        !newPrincipalPending
      ) {
        await fetch(`/api/pecas/${targetPecaId}/fotos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'set_principal', foto_id: newPrincipalExisting.id }),
        })
      }
      if (newPrincipalPending && uploadedPendingPrincipalId) {
        await fetch(`/api/pecas/${targetPecaId}/fotos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'set_principal', foto_id: uploadedPendingPrincipalId }),
        })
      }
    },
  }))

  // ---- Handlers de arquivo ----

  function totalFotos() {
    return existing.filter((f) => !f.toDelete).length + pending.length
  }

  async function handleFiles(files: FileList | File[]) {
    const errs: string[] = []
    const accepted: File[] = []

    for (const file of Array.from(files)) {
      if (file.size > IMAGE_MAX_UPLOAD_BYTES) {
        errs.push(`"${file.name}" — a imagem deve ter no máximo 10 MB`)
        continue
      }
      accepted.push(file)
    }

    const available = MAX_FOTOS - totalFotos()
    if (accepted.length > available) {
      errs.push(`Só é possível adicionar mais ${available} foto(s). Limite: ${MAX_FOTOS}.`)
      accepted.splice(available)
    }

    setErrors(errs)

    const newPending: PendingFoto[] = []

    for (const file of accepted) {
      try {
        const prepared = await preparePreviewableImage(file)
        newPending.push({
          tempId: crypto.randomUUID(),
          file: prepared.file,
          preview: prepared.previewUrl,
          isPrincipal: false,
        })
      } catch (error) {
        errs.push(
          `"${file.name}" — ${
            error instanceof Error ? error.message : IMAGE_INVALID_FORMAT_MESSAGE
          }`,
        )
      }
    }

    setErrors(errs)

    setPending((prev) => {
      const updated = [...prev, ...newPending]
      // Primeira foto da lista vira principal se não há existentes
      const firstPending = updated[0]
      if (existing.filter((f) => !f.toDelete).length === 0 && firstPending) {
        updated[0] = { ...firstPending, isPrincipal: true }
      }
      return updated
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }

  function toggleDeleteExisting(id: string) {
    setExisting((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f
        const nowDeleted = !f.toDelete
        // Se estava como principal e vai ser deletada, remove flag
        return { ...f, toDelete: nowDeleted, is_principal: nowDeleted ? false : f.is_principal }
      }),
    )
  }

  function setPrincipalExisting(id: string) {
    setExisting((prev) => prev.map((f) => ({ ...f, is_principal: f.id === id })))
    setPending((prev) => prev.map((p) => ({ ...p, isPrincipal: false })))
  }

  function removePending(tempId: string) {
    setPending((prev) => {
      const removed = prev.find((p) => p.tempId === tempId)
      if (removed) URL.revokeObjectURL(removed.preview)
      const updated = prev.filter((p) => p.tempId !== tempId)
      // Se removeu o principal e ainda há fotos, promove a primeira
      const wasPrincipal = removed?.isPrincipal
      const firstPending = updated[0]
      if (wasPrincipal && firstPending) {
        updated[0] = { ...firstPending, isPrincipal: true }
      }
      return updated
    })
  }

  function setPrincipalPending(tempId: string) {
    setExisting((prev) => prev.map((f) => ({ ...f, is_principal: false })))
    setPending((prev) => prev.map((p) => ({ ...p, isPrincipal: p.tempId === tempId })))
  }

  const isAtLimit = totalFotos() >= MAX_FOTOS

  return (
    <div>
      <label className="mb-2 block text-[13px] font-medium text-ink-2">Fotos da peça</label>

      {/* Área de drop */}
      {!isAtLimit && !disabled && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`mb-3 cursor-pointer rounded-[10px] border-2 border-dashed p-6 text-center transition-colors ${
            dragging ? 'border-accent bg-accent-light' : 'border-border bg-surface-2 hover:border-accent'
          }`}
        >
          <Upload size={24} className="mx-auto mb-2 text-ink-3" />
          <div className="mb-1 text-sm font-medium text-ink-2">
            Arraste fotos ou clique para selecionar
          </div>
          <div className="text-xs text-ink-3">
            JPG, JPEG, PNG, HEIC ou WEBP · Máx 10 MB · Até {MAX_FOTOS} fotos ({totalFotos()}/{MAX_FOTOS})
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.avif,.heic,.heif"
            multiple
            hidden
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>
      )}

      {/* Erros */}
      {errors.length > 0 && (
        <ul className="mb-3 space-y-1">
          {errors.map((e, i) => (
            <li key={i} className="text-xs text-danger">
              {e}
            </li>
          ))}
        </ul>
      )}

      {/* Grade de fotos */}
      {(existing.length > 0 || pending.length > 0) && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {/* Existentes */}
          {existing.map((foto) => (
            <FotoThumbnail
              key={foto.id}
              src={foto.signed_url}
              isPrincipal={foto.is_principal}
              isDeleted={foto.toDelete}
              onSetPrincipal={() => setPrincipalExisting(foto.id)}
              onToggleDelete={() => toggleDeleteExisting(foto.id)}
              disabled={disabled}
            />
          ))}

          {/* Pendentes */}
          {pending.map((pf) => (
            <FotoThumbnail
              key={pf.tempId}
              src={pf.preview}
              isPrincipal={pf.isPrincipal}
              isDeleted={false}
              isPending
              onSetPrincipal={() => setPrincipalPending(pf.tempId)}
              onToggleDelete={() => removePending(pf.tempId)}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {totalFotos() === 0 && (
        <div className="flex h-[80px] items-center justify-center rounded-[10px] bg-surface-2">
          <div className="flex items-center gap-2 text-sm text-ink-3">
            <Camera size={16} />
            Nenhuma foto adicionada
          </div>
        </div>
      )}

      <p className="mt-2 text-[11px] text-ink-3">
        ⭐ Estrela = foto principal (aparece na listagem e na Cabine)
      </p>
    </div>
  )
})

// =============================================================================
// FotoThumbnail — item da grade
// =============================================================================

function FotoThumbnail({
  src,
  isPrincipal,
  isDeleted,
  isPending = false,
  onSetPrincipal,
  onToggleDelete,
  disabled = false,
}: {
  src: string | null
  isPrincipal: boolean
  isDeleted: boolean
  isPending?: boolean
  onSetPrincipal: () => void
  onToggleDelete: () => void
  disabled?: boolean
}) {
  return (
    <div
      className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
        isPrincipal
          ? 'border-accent'
          : isDeleted
            ? 'border-danger opacity-50'
            : 'border-border'
      }`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover object-center" />
      ) : (
        <div className="h-full w-full bg-[#f0ebe3]" />
      )}

      {/* Badge: pending */}
      {isPending && (
        <span className="absolute left-1 top-1 rounded bg-accent px-1 text-[9px] font-semibold text-white">
          NOVA
        </span>
      )}

      {/* Badge: principal */}
      {isPrincipal && (
        <span className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-accent px-1 py-0.5 text-[9px] font-semibold text-white">
          <Star size={8} fill="currentColor" />
          CAPA
        </span>
      )}

      {/* Overlay de ações (aparecem no hover) */}
      {!disabled && (
        <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-[rgba(20,16,14,0.55)] opacity-0 transition-opacity group-hover:opacity-100">
          {!isPrincipal && !isDeleted && (
            <button
              type="button"
              title="Definir como foto principal"
              onClick={onSetPrincipal}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-accent hover:bg-accent hover:text-white"
            >
              <Star size={13} />
            </button>
          )}
          <button
            type="button"
            title={isDeleted ? 'Restaurar foto' : 'Remover foto'}
            onClick={onToggleDelete}
            className={`flex h-7 w-7 items-center justify-center rounded-full ${
              isDeleted
                ? 'bg-white text-success hover:bg-success hover:text-white'
                : 'bg-white text-danger hover:bg-danger hover:text-white'
            }`}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Upload helper — fluxo: file -> data URL base64 -> API -> storage
// =============================================================================

async function uploadFoto(
  pecaId: string,
  file: File,
  ordem: number,
): Promise<{ id: string; signed_url: string | null; is_principal: boolean }> {
  const dataUrl = await fileToDataUrl(file)

  const uploadRes = await fetch(`/api/pecas/${pecaId}/fotos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'upload_base64',
      filename: file.name,
      contentType: file.type,
      size: file.size,
      ordem,
      data_url: dataUrl,
    }),
  })
  if (!uploadRes.ok) throw new Error('Falha ao enviar foto')
  const { data } = await uploadRes.json()
  return data as { id: string; signed_url: string | null; is_principal: boolean }
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Falha ao converter foto para base64'))
        return
      }
      resolve(reader.result)
    }
    reader.onerror = () => reject(new Error('Falha ao ler foto'))
    reader.readAsDataURL(file)
  })
}
