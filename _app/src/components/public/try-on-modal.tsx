'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Camera,
  Check,
  Download,
  Image as ImageIcon,
  MessageCircle,
  RefreshCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { VVLogo } from '@/components/brand/vv-logo'
import { preparePreviewableImage } from '@/lib/images/client-standardize'
import {
  IMAGE_INVALID_FORMAT_MESSAGE,
  IMAGE_TRY_ON_CUSTOMER_MAX_UPLOAD_BYTES,
  IMAGE_TRY_ON_CUSTOMER_STANDARD_MAX_DIMENSION,
  IMAGE_TRY_ON_CUSTOMER_STANDARD_MAX_SIZE_MB,
} from '@/lib/images/upload'
import { buildVitrineMessage, buildWhatsAppUrl } from '@/lib/whatsapp/link'

type Step = 'upload' | 'confirm' | 'processing' | 'result' | 'error'

type SelectedPhoto = {
  file: File
  previewUrl: string
}

const STEP_INDEX: Record<Exclude<Step, 'error'>, number> = {
  upload: 0,
  confirm: 1,
  processing: 2,
  result: 2,
}
const STEP_LABELS = ['Sua foto', 'Conferir', 'Pronto']

const LOADING_MESSAGES = [
  'Preparando sua simulação…',
  'Analisando proporções…',
  'Vestindo a peça…',
  'Ajustando os detalhes…',
  'Quase lá…',
]

const ACCEPT =
  'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif'

export function TryOnModal({
  open,
  onClose,
  onTryAnother,
  pecaId,
  pecaNome,
  pecaTamanho = null,
  pecaPrecoCentavos = null,
  exibirPreco = false,
  whatsappE164,
  garmentImageUrl,
  garmentThumbUrl,
  cabineBackdropUrl = null,
}: {
  open: boolean
  onClose: () => void
  /** Levar de volta para a grade de peças quando o usuário clica "Experimentar outra peça". */
  onTryAnother?: () => void
  pecaId: string
  pecaNome: string
  pecaTamanho?: string | null
  pecaPrecoCentavos?: number | null
  exibirPreco?: boolean
  whatsappE164: string | null
  garmentImageUrl: string | null
  garmentThumbUrl: string | null
  cabineBackdropUrl?: string | null
}) {
  const [step, setStep] = useState<Step>('upload')
  const [agreed, setAgreed] = useState(false)
  const [customerPhoto, setCustomerPhoto] = useState<SelectedPhoto | null>(null)
  const [progress, setProgress] = useState(0)
  const [msgIdx, setMsgIdx] = useState(0)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const handleTryAnother = useCallback(() => {
    if (onTryAnother) {
      onTryAnother()
      return
    }
    onClose()
  }, [onTryAnother, onClose])

  async function handleDownload() {
    if (!resultUrl) return
    setDownloading(true)
    try {
      const res = await fetch(resultUrl, { mode: 'cors' })
      if (!res.ok) throw new Error('download_failed')
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const safeName =
        pecaNome
          .normalize('NFKD')
          .replace(/[^\w\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-')
          .toLowerCase()
          .slice(0, 60) || 'simulacao'
      const ext = blob.type.includes('png') ? 'png' : 'jpg'
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `cabine-${safeName}.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      if (resultUrl) window.open(resultUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloading(false)
    }
  }

  useEffect(() => {
    if (step !== 'processing') return
    setMsgIdx(0)
    const iv = window.setInterval(() => {
      setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length)
    }, 2000)
    return () => window.clearInterval(iv)
  }, [step])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    const prevPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.paddingRight = prevPaddingRight
      document.removeEventListener('keydown', handler)
    }
  }, [open, onClose])

  useEffect(() => {
    if (open) return
    const timer = window.setTimeout(() => {
      cleanupSelection(customerPhoto)
      setStep('upload')
      setAgreed(false)
      setCustomerPhoto(null)
      setProgress(0)
      setResultUrl(null)
      setErrorMsg(null)
      setUploadError(null)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [open, customerPhoto])

  async function onPick(file: File | null) {
    if (!file) return
    setUploadError(null)
    try {
      const prepared = await preparePreviewableImage(file, {
        maxSizeMB: IMAGE_TRY_ON_CUSTOMER_STANDARD_MAX_SIZE_MB,
        maxUploadBytes: IMAGE_TRY_ON_CUSTOMER_MAX_UPLOAD_BYTES,
        maxWidthOrHeight: IMAGE_TRY_ON_CUSTOMER_STANDARD_MAX_DIMENSION,
      })
      cleanupSelection(customerPhoto)
      setCustomerPhoto(prepared)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : IMAGE_INVALID_FORMAT_MESSAGE)
    }
  }

  async function handleGenerate() {
    if (!customerPhoto) return
    setStep('processing')
    setProgress(0)
    setErrorMsg(null)

    const interval = window.setInterval(() => {
      setProgress((value) => Math.min(92, value + Math.random() * 6 + 2))
    }, 500)

    try {
      const formData = new FormData()
      formData.set('peca_id', pecaId)
      formData.set('consent', 'true')
      formData.set('turnstile_token', 'dev-bypass')
      formData.set('customerPhoto', customerPhoto.file)
      if (garmentImageUrl) {
        formData.set('garment_url_override', garmentImageUrl)
      }

      const res = await fetch('/api/try-on', { method: 'POST', body: formData })
      const data = await res.json()
      window.clearInterval(interval)

      if (!res.ok || !data?.ok) {
        setErrorMsg(data?.error?.message ?? 'Não foi possível gerar a visualização agora.')
        setStep('error')
        return
      }

      setProgress(100)
      setResultUrl(data.data.result_url)
      window.setTimeout(() => setStep('result'), 250)
    } catch {
      window.clearInterval(interval)
      setErrorMsg('Erro de conexão. Tente novamente em instantes.')
      setStep('error')
    }
  }

  if (!open) return null

  // ─── Result screen — full-bleed dark, emotional, minimal ───
  if (step === 'result' && resultUrl) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Resultado da Cabine"
        className="vv-fade-in fixed inset-0 z-[2000] flex flex-col bg-[#0e0c0a]"
      >
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 py-4 sm:px-5">
          <VVLogo size={22} variant="light" />
          <button
            onClick={onClose}
            className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs text-white/75 backdrop-blur transition hover:bg-white/20 sm:text-[12.5px]"
          >
            Fechar
          </button>
        </div>

        <div className="relative flex-1 overflow-hidden">
          {cabineBackdropUrl ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-15"
              style={{ backgroundImage: `url("${cabineBackdropUrl}")` }}
            />
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resultUrl}
            alt="Resultado da Cabine"
            className="vv-blur-in absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#0e0c0a]/95 via-[#0e0c0a]/40 to-transparent" />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-4 top-[78px] flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 backdrop-blur-md"
            style={{ animation: 'vv-fade 0.6s var(--e-out) 0.5s both' }}
          >
            <span className="block h-1 w-1 rounded-full bg-white/70" />
            <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80">
              Simulação gerada
            </span>
          </div>

          <div
            className="absolute inset-x-0 bottom-0 px-5 pb-7 pt-6 sm:px-7 sm:pb-8"
            style={{ animation: 'vv-fade-up 0.55s var(--e-out) 0.25s both' }}
          >
            <div className="font-serif text-[15px] italic tracking-wide text-white/55">
              Veja como ficou em você
            </div>
            <div className="mt-2 font-serif text-[24px] font-semibold leading-tight tracking-tight text-white sm:text-[26px]">
              {pecaNome}
            </div>
            {pecaTamanho ? (
              <div className="mt-1 font-sans text-[13px] text-white/50">{pecaTamanho}</div>
            ) : null}
            {exibirPreco && pecaPrecoCentavos != null ? (
              <div className="mt-3 font-serif text-[20px] font-medium text-white/85">
                {formatPreco(pecaPrecoCentavos)}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              {whatsappE164 ? (
                <a
                  href={buildWhatsAppUrl(whatsappE164, buildVitrineMessage({ pecaNome })) ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 font-sans text-sm font-semibold text-ink transition hover:opacity-90"
                  style={{ minWidth: 180 }}
                >
                  <MessageCircle size={16} />
                  Falar com a loja
                </a>
              ) : null}
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-4 py-3 font-sans text-[13.5px] font-medium text-white/90 backdrop-blur transition hover:bg-white/20 disabled:opacity-60"
              >
                <Download size={14} />
                {downloading ? 'Baixando…' : 'Baixar'}
              </button>
              <button
                onClick={handleTryAnother}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-4 py-3 font-sans text-[13.5px] text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                Experimentar outra peça
              </button>
            </div>
            <div className="mt-3 text-center font-sans text-[11px] text-white/35">
              Imagem gerada por simulação · expira em 24h e não é armazenada
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Bottom-sheet for upload / confirm / processing / error ───
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cabine Virtual"
      onClick={onClose}
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-[rgba(18,14,12,0.68)] p-0 backdrop-blur"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94vh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[22px] bg-surface shadow-[0_-8px_60px_rgba(0,0,0,0.22)]"
        style={{ animation: 'vv-slide-up 0.35s var(--e-out-soft)' }}
      >
        <div className="flex justify-center pb-1 pt-2.5">
          <div className="h-1 w-10 rounded-full bg-border-2" />
        </div>

        <div className="flex items-start justify-between gap-3.5 px-5 pb-1.5 pt-2 sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="font-sans text-[9.5px] font-semibold uppercase tracking-[0.18em] text-ink-3">
              Cabine Virtual
            </div>
            <div className="mt-1 truncate font-serif text-[21px] font-normal leading-tight tracking-tight text-ink">
              {pecaNome}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="-mt-0.5 flex items-center justify-center rounded-lg p-1.5 text-ink-3 transition hover:bg-surface-2"
          >
            <X size={17} />
          </button>
        </div>

        <CabineStepper step={step === 'error' ? 'upload' : step} />

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-7 pt-1 sm:px-6">
          {step === 'upload' ? (
            <UploadStep
              mirrorPhoto={customerPhoto}
              setMirrorPhoto={(p) => {
                cleanupSelection(customerPhoto)
                setCustomerPhoto(p)
                setUploadError(null)
              }}
              uploadError={uploadError}
              pecaNome={pecaNome}
              pecaTamanho={pecaTamanho}
              garmentThumbUrl={garmentThumbUrl}
              agreed={agreed}
              setAgreed={setAgreed}
              onNext={() => setStep('confirm')}
              onCamera={() => cameraRef.current?.click()}
              onGallery={() => galleryRef.current?.click()}
              onPick={onPick}
            />
          ) : null}

          {step === 'confirm' ? (
            <ConfirmStep
              mirrorPhoto={customerPhoto}
              garmentThumbUrl={garmentThumbUrl}
              pecaNome={pecaNome}
              onBack={() => setStep('upload')}
              onGenerate={handleGenerate}
            />
          ) : null}

          {step === 'processing' ? (
            <ProcessingStep progress={progress} message={LOADING_MESSAGES[msgIdx] ?? ''} />
          ) : null}

          {step === 'error' ? (
            <ErrorStep
              message={errorMsg}
              onBack={() => setStep('upload')}
              onRetry={handleGenerate}
              canRetry={!!customerPhoto}
            />
          ) : null}
        </div>

        <input
          ref={cameraRef}
          type="file"
          accept={ACCEPT}
          capture="user"
          hidden
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
        <input
          ref={galleryRef}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  )
}

function CabineStepper({ step }: { step: Exclude<Step, 'error'> }) {
  const idx = STEP_INDEX[step] ?? 0
  return (
    <div className="px-5 pb-5 pt-4 sm:px-6">
      <div className="mb-2.5 flex gap-1.5">
        {[0, 1, 2].map((i) => {
          const done = i < idx
          const active = i === idx
          return (
            <div
              key={i}
              className="relative h-[2px] flex-1 overflow-hidden rounded-sm"
              style={{
                background: done ? '#1e1a17' : active ? 'transparent' : 'rgba(30,26,23,0.10)',
              }}
            >
              {active ? (
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(90deg, #1e1a17 0%, #1e1a17 50%, rgba(30,26,23,0.10) 50%, rgba(30,26,23,0.10) 100%)',
                    backgroundSize: '200% 100%',
                    backgroundPosition: 'right center',
                    animation: 'vv-step-fill 480ms var(--e-out) forwards',
                  }}
                />
              ) : null}
            </div>
          )
        })}
      </div>
      <div className="flex gap-1.5">
        {STEP_LABELS.map((label, i) => {
          const done = i < idx
          const active = i === idx
          return (
            <div
              key={label}
              className="flex-1 font-sans text-[10px] uppercase tracking-[0.16em] transition"
              style={{
                fontWeight: done || active ? 600 : 400,
                color: done || active ? '#1e1a17' : '#b0a59d',
              }}
            >
              {label}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function UploadStep({
  mirrorPhoto,
  setMirrorPhoto,
  uploadError,
  pecaNome,
  pecaTamanho,
  garmentThumbUrl,
  agreed,
  setAgreed,
  onNext,
  onCamera,
  onGallery,
  onPick,
}: {
  mirrorPhoto: SelectedPhoto | null
  setMirrorPhoto: (p: SelectedPhoto | null) => void
  uploadError: string | null
  pecaNome: string
  pecaTamanho?: string | null
  garmentThumbUrl: string | null
  agreed: boolean
  setAgreed: (v: boolean) => void
  onNext: () => void
  onCamera: () => void
  onGallery: () => void
  onPick: (file: File | null) => Promise<void>
}) {
  const [drag, setDrag] = useState(false)
  const canConfirm = !!mirrorPhoto && agreed

  return (
    <div className="flex flex-col gap-[22px]" style={{ animation: 'vv-fade 0.25s var(--e-out)' }}>
      <div className="flex items-center gap-3 border-b border-border pb-[18px]">
        <div className="h-14 w-11 shrink-0 overflow-hidden rounded-md bg-surface-2">
          {garmentThumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={garmentThumbUrl}
              alt=""
              className="h-full w-full object-cover object-center"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-sans text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">
            Experimentando
          </div>
          <div className="truncate font-serif text-[17px] font-normal tracking-tight text-ink">
            {pecaNome}
          </div>
          {pecaTamanho ? <div className="mt-px text-[11.5px] text-ink-3">{pecaTamanho}</div> : null}
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        <div>
          <div className="font-serif text-[22px] font-normal leading-snug tracking-tight text-ink">
            Sua foto no espelho
          </div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
            Uma selfie de corpo inteiro, em frente ao espelho, com boa iluminação.
          </p>
        </div>

        {mirrorPhoto ? (
          <UploadPreview
            value={mirrorPhoto}
            onChange={onPick}
            onRemove={() => setMirrorPhoto(null)}
          />
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={onGallery}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onGallery()
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={async (e) => {
              e.preventDefault()
              setDrag(false)
              const f = e.dataTransfer.files?.[0] ?? null
              if (f) await onPick(f)
            }}
            className="flex aspect-[3/4] w-full cursor-pointer flex-col items-center justify-center gap-3.5 rounded-xl transition"
            style={{
              border: `1px ${drag ? 'solid' : 'dashed'} ${
                uploadError ? '#c47a7a' : drag ? '#1e1a17' : 'rgba(30,26,23,0.10)'
              }`,
              background: drag ? 'rgba(184,149,106,0.06)' : uploadError ? '#f7ebeb' : 'transparent',
            }}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{
                background: uploadError ? '#f7ebeb' : '#f5f0ea',
                color: uploadError ? '#c47a7a' : '#6d6460',
              }}
            >
              <Upload size={15} />
            </div>
            <div className="max-w-[280px] px-4 text-center">
              <div
                className="font-sans text-[13px] font-medium"
                style={{ color: uploadError ? '#c47a7a' : '#1e1a17' }}
              >
                {uploadError ?? 'Toque para selecionar uma foto'}
              </div>
              <div className="mt-1 font-sans text-[11.5px] text-ink-3">
                {uploadError ? 'tente novamente' : 'ou arraste para esta área · JPEG · PNG · WebP'}
              </div>
            </div>
          </div>
        )}

        {!mirrorPhoto ? (
          <div className="flex flex-wrap gap-4 px-0.5">
            {['Corpo inteiro', 'Boa luz natural', 'Fundo neutro'].map((t, i) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 font-sans text-[10.5px] uppercase tracking-wider text-ink-3"
                style={{ animation: `vv-fade-up 0.3s ease-out ${i * 60}ms both` }}
              >
                <span className="h-[3px] w-[3px] rounded-full bg-ink-3" />
                {t}
              </span>
            ))}
          </div>
        ) : null}

        {!mirrorPhoto ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCamera}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2.5 text-[12.5px] font-medium text-ink transition hover:border-accent"
            >
              <Camera size={14} />
              Câmera
            </button>
            <button
              type="button"
              onClick={onGallery}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2.5 text-[12.5px] font-medium text-ink transition hover:border-accent"
            >
              <ImageIcon size={14} />
              Galeria
            </button>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setAgreed(!agreed)}
        className="flex items-start gap-2.5 py-0.5 text-left"
      >
        <span
          className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded transition"
          style={{
            border: `1.5px solid ${agreed ? '#1e1a17' : 'rgba(30,26,23,0.25)'}`,
            background: agreed ? '#1e1a17' : 'transparent',
          }}
        >
          {agreed ? <Check size={9} className="text-white" /> : null}
        </span>
        <span className="font-sans text-[11.5px] leading-relaxed text-ink-2">
          Concordo com o uso temporário da minha foto para gerar a simulação. A imagem não é
          armazenada.{' '}
          <a
            href="/privacidade"
            target="_blank"
            rel="noreferrer"
            className="text-ink underline underline-offset-2"
          >
            Política de privacidade
          </a>
        </span>
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={!canConfirm}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-7 py-3.5 font-sans text-[15px] font-medium text-white transition hover:bg-[#2d2825] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continuar
      </button>
    </div>
  )
}

function UploadPreview({
  value,
  onChange,
  onRemove,
}: {
  value: SelectedPhoto
  onChange: (file: File | null) => Promise<void>
  onRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="flex flex-col gap-2.5" style={{ animation: 'vv-fade 0.32s var(--e-out)' }}>
      <div
        className="group relative aspect-[3/4] w-full overflow-hidden rounded-2xl"
        style={{ background: 'linear-gradient(180deg, #f5f0ea 0%, #ede6dc 100%)' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value.previewUrl} alt="Sua foto" className="block h-full w-full object-contain" />
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/45 via-transparent to-transparent p-3.5 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-[11.5px] font-medium text-ink"
            >
              <RefreshCcw size={11} />
              Trocar
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center justify-center rounded-full bg-white/95 p-2 text-danger"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-0.5">
        <span className="flex-1 truncate font-sans text-[11.5px] text-ink-3">
          {value.file.name}
        </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="font-sans text-[11.5px] text-ink-2"
        >
          Trocar imagem
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}

function ConfirmStep({
  mirrorPhoto,
  garmentThumbUrl,
  pecaNome,
  onBack,
  onGenerate,
}: {
  mirrorPhoto: SelectedPhoto | null
  garmentThumbUrl: string | null
  pecaNome: string
  onBack: () => void
  onGenerate: () => void
}) {
  return (
    <div className="flex flex-col gap-[22px]" style={{ animation: 'vv-fade 0.25s var(--e-out)' }}>
      <div>
        <div className="font-serif text-[22px] font-normal leading-snug tracking-tight text-ink">
          Vamos lá?
        </div>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
          Confira sua foto e a peça antes de gerar a prévia.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        {[
          { label: 'Sua foto', url: mirrorPhoto?.previewUrl ?? null, alt: 'Sua foto' },
          { label: 'Peça', url: garmentThumbUrl, alt: pecaNome },
        ].map((item) => (
          <div key={item.label} className="flex flex-col gap-2">
            <div
              className="aspect-[3/4] overflow-hidden rounded-xl"
              style={{ background: 'linear-gradient(180deg, #f5f0ea 0%, #ede6dc 100%)' }}
            >
              {item.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.alt} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-ink-3">
                  <ImageIcon size={20} />
                </div>
              )}
            </div>
            <div className="text-center font-sans text-[9.5px] font-semibold uppercase tracking-[0.16em] text-ink-3">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      <p className="px-2 text-center font-serif text-[13px] italic leading-relaxed text-ink-3">
        “O resultado é uma simulação visual — uma prévia inspiradora, não uma fotografia.”
      </p>

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-full border border-border bg-transparent px-5 py-3 font-sans text-[13.5px] text-ink transition hover:bg-surface-2"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={onGenerate}
          className="flex-[2] rounded-full bg-ink px-5 py-3 font-sans text-[13.5px] font-medium text-white transition hover:bg-[#2d2825]"
        >
          Gerar prévia
        </button>
      </div>
    </div>
  )
}

function ProcessingStep({ progress, message }: { progress: number; message: string }) {
  const barW = Math.min(progress, 100)
  return (
    <div
      className="flex flex-col items-center justify-center gap-[30px] py-10 sm:py-8"
      style={{ animation: 'vv-fade 0.3s var(--e-out)' }}
    >
      <div className="relative h-[104px] w-[104px]">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, #b8956a22 0%, transparent 65%)',
            animation: 'vv-breathe 3.2s var(--e-inout) infinite',
          }}
        />
        <svg
          width="104"
          height="104"
          viewBox="0 0 104 104"
          className="absolute inset-0"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="vv-cabine-arc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#b8956a" stopOpacity="0" />
              <stop offset="100%" stopColor="#b8956a" stopOpacity="1" />
            </linearGradient>
          </defs>
          <circle cx="52" cy="52" r="44" fill="none" stroke="#e6dfd6" strokeWidth="1.5" />
          <circle
            cx="52"
            cy="52"
            r="44"
            fill="none"
            stroke="url(#vv-cabine-arc)"
            strokeWidth="2.5"
            strokeDasharray="60 220"
            strokeLinecap="round"
            style={{
              transformOrigin: '52px 52px',
              animation: 'vv-spin 1.6s linear infinite',
            }}
          />
          <circle
            cx="52"
            cy="52"
            r="30"
            fill="none"
            stroke="#b8956a"
            strokeWidth="1"
            strokeOpacity="0.35"
            strokeDasharray="3 8"
            style={{
              transformOrigin: '52px 52px',
              animation: 'vv-spin 6s linear infinite reverse',
            }}
          />
        </svg>
        <div
          className="absolute inset-[28%] flex items-center justify-center rounded-full bg-surface"
          style={{
            boxShadow: '0 4px 18px #b8956a30',
            animation: 'vv-breathe 2.4s var(--e-inout) infinite',
          }}
        >
          <span className="font-serif text-[18px] font-semibold italic tracking-wider text-ink">
            vv
          </span>
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 h-[5px] w-[5px] rounded-full bg-accent"
            style={{
              marginLeft: '-2.5px',
              marginTop: '-2.5px',
              opacity: 0.55,
              animation: `vv-orbit ${3.4 + i * 0.7}s linear infinite`,
              transformOrigin: `0 ${44 + i * 4}px`,
            }}
          />
        ))}
      </div>

      <div className="max-w-[260px] text-center">
        <div className="font-serif text-[20px] font-medium leading-snug text-ink">
          Criando sua experiência
        </div>
        <div
          key={message}
          className="mt-2 min-h-[20px] font-sans text-[13px] leading-relaxed text-ink-3"
          style={{ animation: 'vv-fade-up 0.45s var(--e-out)' }}
        >
          {message}
        </div>
      </div>

      <div className="relative h-[3px] w-full max-w-[220px] overflow-hidden rounded-sm bg-border">
        <div
          className="relative h-full overflow-hidden rounded-sm transition-[width] duration-500"
          style={{
            width: `${barW}%`,
            background: 'linear-gradient(90deg, #b8956a, #8b6840)',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)',
              transform: 'translateX(-100%)',
              animation: 'vv-shine 1.6s var(--e-inout) infinite',
            }}
          />
        </div>
      </div>
    </div>
  )
}

function ErrorStep({
  message,
  onBack,
  onRetry,
  canRetry,
}: {
  message: string | null
  onBack: () => void
  onRetry: () => void
  canRetry: boolean
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 py-8 text-center">
      <div className="font-serif text-[18px] font-semibold text-ink">
        Não foi possível gerar agora
      </div>
      <p className="max-w-[340px] text-[13px] leading-relaxed text-ink-3">
        {message ?? 'Tente novamente em instantes com outra foto.'}
      </p>
      <div className="mt-4 flex gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-border bg-transparent px-5 py-2.5 font-sans text-[13px] text-ink transition hover:bg-surface-2"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={onRetry}
          disabled={!canRetry}
          className="rounded-full bg-ink px-5 py-2.5 font-sans text-[13px] font-medium text-white transition hover:bg-[#2d2825] disabled:opacity-50"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}

function cleanupSelection(photo: SelectedPhoto | null) {
  if (photo?.previewUrl) URL.revokeObjectURL(photo.previewUrl)
}

function formatPreco(centavos: number): string {
  const reais = centavos / 100
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(reais)
}
