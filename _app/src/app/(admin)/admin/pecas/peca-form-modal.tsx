'use client'

import { useEffect, useRef, useState } from 'react'
import { FotoUploader, type ExistingFoto, type FotoUploaderHandle } from '@/components/admin/foto-uploader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { CATEGORIAS, categoriaNameToId } from '@/lib/categorias'
import {
  centavosToPrecoString,
  precoStringToCentavos,
} from '@/lib/validators/peca'
import { sortSizes } from '@/lib/sizes'
import type { PecaRow } from '@/types/database'

const TAMANHOS_PADRAO = sortSizes(['PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG', '36', '38', '40', '42', '44', 'Único'])

const CUSTOM_CATEGORIA_VALUE = '__custom__'

export function PecaFormModal({
  open,
  peca,
  onClose,
  onSaved,
  categoriasExtra = [],
}: {
  open: boolean
  peca: PecaRow | null
  onClose: () => void
  onSaved: () => void
  categoriasExtra?: string[]
}) {
  const [nome, setNome] = useState('')
  const [preco, setPreco] = useState('')
  const [tamanhosSel, setTamanhosSel] = useState<string[]>([])
  const [tamanhoCustom, setTamanhoCustom] = useState('')
  const [categoriaSel, setCategoriaSel] = useState<string>('')
  const [categoriaCustom, setCategoriaCustom] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [existingFotos, setExistingFotos] = useState<ExistingFoto[]>([])
  const [loadingFotos, setLoadingFotos] = useState(false)
  const uploaderRef = useRef<FotoUploaderHandle>(null)

  useEffect(() => {
    if (!open) return

    setNome(peca?.nome ?? '')
    setPreco(centavosToPrecoString(peca?.preco_centavos))
    setErr(null)
    setExistingFotos([])

    // Parse tamanhos existentes nos chips
    if (peca?.tamanho) {
      const parts = peca.tamanho.split(/[,·\s]+/).map((t) => t.trim()).filter(Boolean)
      const known = parts.filter((t) => TAMANHOS_PADRAO.includes(t))
      const custom = parts.filter((t) => !TAMANHOS_PADRAO.includes(t))
      setTamanhosSel(known)
      setTamanhoCustom(custom.join(', '))
    } else {
      setTamanhosSel([])
      setTamanhoCustom('')
    }

    // Categoria — se está nas pré-definidas ou em categoriasExtra, marca; se é nova, vai no input.
    if (peca?.categoria_id) {
      const isPredef = CATEGORIAS.some((c) => c.id === peca.categoria_id)
      const isKnownExtra = categoriasExtra.includes(peca.categoria_id)
      if (isPredef || isKnownExtra) {
        setCategoriaSel(peca.categoria_id)
        setCategoriaCustom('')
      } else {
        setCategoriaSel(CUSTOM_CATEGORIA_VALUE)
        setCategoriaCustom(peca.categoria_id)
      }
    } else {
      setCategoriaSel('')
      setCategoriaCustom('')
    }

    if (!peca?.id) return

    setLoadingFotos(true)
    fetch(`/api/pecas/${peca.id}/fotos`)
      .then((res) => res.json())
      .then((data) => {
        const fotos = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
        setExistingFotos(fotos as ExistingFoto[])
      })
      .catch(() => {
        setErr('Não foi possível carregar as fotos atuais da peça.')
      })
      .finally(() => setLoadingFotos(false))
  }, [open, peca])

  function toggleTamanho(t: string) {
    setTamanhosSel((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    )
  }

  function buildTamanhoString(): string | null {
    const all = sortSizes([
      ...tamanhosSel,
      ...tamanhoCustom.split(',').map((t) => t.trim()).filter(Boolean),
    ])
    return all.length > 0 ? all.join(', ') : null
  }

  function buildCategoriaId(): string | null {
    if (!categoriaSel) return null
    if (categoriaSel === CUSTOM_CATEGORIA_VALUE) {
      const slug = categoriaNameToId(categoriaCustom)
      return slug || null
    }
    return categoriaSel
  }

  async function handleSave() {
    if (!nome.trim()) return
    setSaving(true)
    setErr(null)

    try {
      let precoCentavos: number | null = null
      try {
        precoCentavos = preco ? precoStringToCentavos(preco) : null
      } catch {
        setErr('Preço inválido.')
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
          tamanho: buildTamanhoString(),
          categoria_id: buildCategoriaId(),
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.ok) {
        setErr(data?.error?.message ?? 'Falha ao salvar peça.')
        return
      }

      const savedPecaId = (data.data?.id ?? peca?.id) as string | undefined
      if (uploaderRef.current && savedPecaId) {
        try {
          await uploaderRef.current.flush(savedPecaId, peca?.foto_principal_id ?? null)
        } catch (fotoErr) {
          console.error('[PecaFormModal] Erro nas fotos:', fotoErr)
          setErr('Peça salva, mas houve um problema ao aplicar as fotos.')
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
        {/* Nome — único campo obrigatório */}
        <Input
          label="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Blazer de linho"
          disabled={saving}
        />

        {/* Preço — opcional */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-ink-2">Preço</span>
            <span className="text-[11px] text-ink-3">opcional</span>
          </div>
          <Input
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            placeholder="89,90"
            disabled={saving}
            inputMode="decimal"
            helper="Aceita 89,90 ou 89.90"
          />
        </div>

        {/* Categoria — opcional, com opção custom */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-ink-2">Categoria</span>
            <span className="text-[11px] text-ink-3">opcional</span>
          </div>
          <div className="relative">
            <select
              value={categoriaSel}
              onChange={(e) => setCategoriaSel(e.target.value)}
              disabled={saving}
              className="w-full appearance-none rounded-lg border border-border bg-surface px-3 py-[9px] pr-9 text-sm text-ink outline-none transition focus:border-accent disabled:opacity-60"
            >
              <option value="">Sem categoria</option>
              {CATEGORIAS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
              {categoriasExtra.length > 0 ? (
                <optgroup label="Suas categorias">
                  {categoriasExtra.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              <option value={CUSTOM_CATEGORIA_VALUE}>+ Adicionar categoria personalizada</option>
            </select>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
            >
              ▾
            </span>
          </div>
          {categoriaSel === CUSTOM_CATEGORIA_VALUE ? (
            <>
              <input
                type="text"
                value={categoriaCustom}
                onChange={(e) => setCategoriaCustom(e.target.value)}
                placeholder="Nome da categoria…"
                disabled={saving}
                maxLength={60}
                className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-accent"
              />
              {categoriaCustom.trim() ? (
                <p className="mt-1 font-sans text-[11px] text-ink-3">
                  Esta categoria fica salva para as próximas peças.
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        {/* Tamanhos — chips múltiplos, opcional */}
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-ink-2">Tamanhos</span>
            <span className="text-[11px] text-ink-3">opcional</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TAMANHOS_PADRAO.map((t) => {
              const on = tamanhosSel.includes(t)
              return (
                <button
                  key={t}
                  type="button"
                  disabled={saving}
                  onClick={() => toggleTamanho(t)}
                  className={`rounded-full border px-3 py-1 text-[12.5px] transition ${
                    on
                      ? 'border-accent bg-accent-light font-semibold text-accent-dark'
                      : 'border-border text-ink-2 hover:border-border-2'
                  }`}
                >
                  {t}
                </button>
              )
            })}
          </div>
          {tamanhosSel.length > 0 && (
            <p className="mt-2 text-[11.5px] text-ink-3">
              Selecionados: {sortSizes(tamanhosSel).join(', ')}
            </p>
          )}
          {/* Campo livre para tamanhos não listados */}
          <input
            type="text"
            value={tamanhoCustom}
            onChange={(e) => setTamanhoCustom(e.target.value)}
            placeholder="Outros (ex: 46, XGG)"
            disabled={saving}
            className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent"
          />
        </div>

        {/* Fotos */}
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

        {/* Info: publicação automática */}
        {!peca ? (
          <div className="flex items-start gap-2 rounded-lg bg-accent-light px-3 py-2.5">
            <span className="mt-0.5 text-accent-dark">◈</span>
            <span className="text-[12px] leading-snug text-accent-dark">
              Publicada automaticamente como <strong className="font-semibold">disponível</strong>.
            </span>
          </div>
        ) : null}

        {err ? <p className="text-sm text-danger">{err}</p> : null}
      </div>
    </Modal>
  )
}
