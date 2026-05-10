'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Check,
  Download,
  Image as ImageIcon,
  ImageOff,
  MessageCircle,
  UserRound,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { preparePreviewableImage } from '@/lib/images/client-standardize'
import { IMAGE_INVALID_FORMAT_MESSAGE } from '@/lib/images/upload'
import { buildVitrineMessage, buildWhatsAppUrl } from '@/lib/whatsapp/link'

type Step = 'choose' | 'preview' | 'loading' | 'result' | 'error'

type SelectedPhoto = {
  file: File
  previewUrl: string
}

const STEPS: Array<{ id: Exclude<Step, 'error'>; label: string }> = [
  { id: 'choose', label: 'Sua foto' },
  { id: 'preview', label: 'Confirmar' },
  { id: 'loading', label: 'Gerando' },
  { id: 'result', label: 'Resultado' },
]

const LOADING_MESSAGES = [
  'Preparando sua visualização…',
  'Analisando a peça…',
  'Combinando looks…',
  'Quase lá…',
  'Finalizando os detalhes…',
]

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif'

export function TryOnModal({
  open,
  onClose,
  onTryAnother,
  pecaId,
  pecaNome,
  whatsappE164,
  garmentImageUrl,
  garmentThumbUrl,
}: {
  open: boolean
  onClose: () => void
  /**
   * Quando o usuário clica "Experimentar outra peça" no resultado,
   * fechamos o modal e chamamos este callback para levar de volta à
   * tela com a grade de peças. Default: apenas fecha o modal.
   */
  onTryAnother?: () => void
  pecaId: string
  pecaNome: string
  whatsappE164: string | null
  garmentImageUrl: string | null
  garmentThumbUrl: string | null
}) {
  const [step, setStep] = useState<Step>('choose')
  const [agreed, setAgreed] = useState(false)
  const [customerPhoto, setCustomerPhoto] = useState<SelectedPhoto | null>(null)
  const [progress, setProgress] = useState(0)
  const [msgIdx, setMsgIdx] = useState(0)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [validationAttempted, setValidationAttempted] = useState(false)
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
      const safeName = pecaNome
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
      // Fallback: abre em nova aba se o navegador bloquear o download CORS
      if (resultUrl) window.open(resultUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloading(false)
    }
  }

  const canContinue = agreed && !!customerPhoto
  const waUrl = whatsappE164
    ? buildWhatsAppUrl(whatsappE164, buildVitrineMessage({ pecaNome }))
    : null
  const currentStepIndex = Math.max(0, STEPS.findIndex((item) => item.id === step))

  useEffect(() => {
    if (step !== 'loading') return
    setMsgIdx(0)
    const iv = window.setInterval(() => {
      setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length)
    }, 2200)
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
      setStep('choose')
      setAgreed(false)
      setCustomerPhoto(null)
      setProgress(0)
      setResultUrl(null)
      setErrorMsg(null)
      setValidationAttempted(false)
    }, 180)
    return () => window.clearTimeout(timer)
  }, [open, customerPhoto])

  function renderFooter() {
    if (step === 'choose') {
      return (
        <>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          <Button variant="dark" onClick={handlePreviewStep} disabled={!agreed}>
            Confirmar foto
          </Button>
        </>
      )
    }

    if (step === 'preview') {
      return (
        <>
          <Button variant="ghost" onClick={() => setStep('choose')}>
            Ajustar foto
          </Button>
          <Button variant="dark" onClick={handleGenerate} disabled={!canContinue}>
            Entrar na Cabine
          </Button>
        </>
      )
    }

    if (step === 'result') {
      return (
        <>
          <Button variant="ghost" onClick={handleTryAnother}>
            Experimentar outra peça
          </Button>
          <Button
            variant="ghost"
            onClick={handleDownload}
            disabled={!resultUrl || downloading}
            icon={<Download size={15} />}
          >
            {downloading ? 'Baixando…' : 'Baixar'}
          </Button>
          {waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25d366] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1da855]"
            >
              <MessageCircle size={15} />
              Falar com a loja
            </a>
          ) : null}
        </>
      )
    }

    if (step === 'error') {
      return (
        <>
          <Button variant="ghost" onClick={() => setStep('choose')}>
            Voltar
          </Button>
          <Button variant="dark" onClick={handleGenerate} disabled={!customerPhoto}>
            Tentar novamente
          </Button>
        </>
      )
    }

    return null
  }

  async function onPick(file: File | null) {
    if (!file) return
    try {
      const prepared = await preparePreviewableImage(file)
      cleanupSelection(customerPhoto)
      setCustomerPhoto(prepared)
      setErrorMsg(null)
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : IMAGE_INVALID_FORMAT_MESSAGE)
    }
  }

  function handlePreviewStep() {
    setValidationAttempted(true)
    if (!customerPhoto) {
      setErrorMsg('Envie uma foto para continuar.')
      return
    }
    setErrorMsg(null)
    setStep('preview')
  }

  async function handleGenerate() {
    if (!customerPhoto) {
      setValidationAttempted(true)
      setErrorMsg('A foto é obrigatória para usar a Cabine.')
      setStep('choose')
      return
    }

    setStep('loading')
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
      window.setTimeout(() => setStep('result'), 200)
    } catch {
      window.clearInterval(interval)
      setErrorMsg('Erro de conexão. Tente novamente em instantes.')
      setStep('error')
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cabine Virtual"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(20,16,14,0.7)] p-0 backdrop-blur sm:items-center sm:p-5"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] min-h-[60vh] w-full max-w-[680px] flex-col overflow-hidden rounded-t-[22px] bg-surface shadow-modal sm:min-h-0 sm:rounded-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
          <div>
            <div className="font-serif text-xl font-semibold">Cabine</div>
            <div className="mt-0.5 text-xs text-ink-3">{pecaNome}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded p-1 text-ink-3 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 px-4 py-3 sm:px-6">
          {STEPS.map((item, index) => {
            const done = index < currentStepIndex || step === 'result'
            const active = index === currentStepIndex && step !== 'error'

            return (
              <div key={item.id} className="flex flex-1 items-center gap-1.5">
                <div
                  className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    done
                      ? 'bg-success text-white'
                      : active
                        ? 'bg-accent text-white'
                        : 'bg-border text-ink-3'
                  }`}
                >
                  {done ? <Check size={11} /> : index + 1}
                </div>
                <span className={`hidden text-xs sm:inline ${active ? 'font-semibold text-ink' : 'text-ink-3'}`}>
                  {item.label}
                </span>
                {index < STEPS.length - 1 ? (
                  <div className={`h-px flex-1 ${done ? 'bg-success' : 'bg-border'}`} />
                ) : null}
              </div>
            )
          })}
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-2 sm:px-6 sm:pb-6">
          {step === 'choose' ? (
            <div className="space-y-5">
              <div>
                <div className="text-sm font-medium">Envie uma foto sua para continuar.</div>
                <div className="mt-1 text-[13px] text-ink-3">
                  Sua foto é usada apenas para gerar a visualização e descartada em seguida.
                </div>
              </div>

              <PhotoField
                title="Sua foto"
                helper="Envie uma foto mostrando o corpo inteiro, de preferência em boa iluminação e fundo neutro."
                previewUrl={customerPhoto?.previewUrl ?? null}
                error={validationAttempted && !customerPhoto ? 'Envie uma foto para continuar.' : null}
                onCamera={() => cameraRef.current?.click()}
                onGallery={() => galleryRef.current?.click()}
              />

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

              <button
                type="button"
                onClick={() => setAgreed((value) => !value)}
                className="flex w-full items-start gap-2.5 rounded-[10px] bg-accent-light p-3 text-left"
              >
                <span
                  className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2 ${
                    agreed ? 'border-accent bg-accent' : 'border-border bg-white'
                  }`}
                >
                  {agreed ? <Check size={11} className="text-white" /> : null}
                </span>
                <span className="text-xs leading-relaxed text-ink-2">
                  Concordo que minha foto seja usada apenas para gerar a visualização e descartada após o processamento.
                </span>
              </button>

              <p className="text-center text-[11px] text-ink-3">
                Leia nossa{' '}
                <a href="/privacidade" className="text-accent underline" target="_blank" rel="noreferrer">
                  política de privacidade
                </a>
                .
              </p>

              {errorMsg ? <p className="text-center text-sm text-danger">{errorMsg}</p> : null}
            </div>
          ) : null}

          {step === 'preview' ? (
            <div className="space-y-4">
              <div className="text-sm text-ink-2">Confirme a foto antes de continuar.</div>
              <div className="grid grid-cols-2 gap-3">
                <PreviewCard label="Sua foto" src={customerPhoto?.previewUrl ?? null} alt="Sua foto" />
                <PreviewCard label="Peça" src={garmentThumbUrl} alt={pecaNome} fallback={pecaNome} />
              </div>
              <div className="rounded-[10px] bg-surface-2 px-4 py-3 text-xs text-ink-2">
                Foto pronta. Clique em &quot;Entrar na Cabine&quot; para gerar a visualização.
              </div>
            </div>
          ) : null}

          {step === 'loading' ? (
            <div className="flex min-h-full flex-col items-center justify-center py-8 text-center">
              <div className="relative mb-6 h-24 w-24">
                {/* Halo respirando atrás */}
                <span
                  className="absolute inset-0 rounded-full bg-accent/15"
                  style={{ animation: 'vv-breathe 2.6s ease-in-out infinite' }}
                />
                {/* Anel girando */}
                <svg
                  width="96"
                  height="96"
                  viewBox="0 0 96 96"
                  className="absolute inset-0"
                  style={{ animation: 'vv-spin 2.4s linear infinite' }}
                >
                  <circle cx="48" cy="48" r="40" fill="none" stroke="#e6dfd6" strokeWidth="3" />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="#b8956a"
                    strokeWidth="3"
                    strokeDasharray="70 181"
                    strokeLinecap="round"
                    transform="rotate(-90 48 48)"
                  />
                </svg>
                {/* Partículas em órbita oposta */}
                <svg
                  width="96"
                  height="96"
                  viewBox="0 0 96 96"
                  className="absolute inset-0"
                  style={{ animation: 'vv-spin 6s linear infinite reverse' }}
                  aria-hidden="true"
                >
                  <circle cx="48" cy="8" r="2" fill="#b8956a" opacity="0.7" />
                  <circle cx="88" cy="48" r="1.4" fill="#8b6840" opacity="0.55" />
                  <circle cx="48" cy="88" r="1.6" fill="#b8956a" opacity="0.45" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="font-serif text-lg font-semibold text-accent"
                    style={{ letterSpacing: '0.5px', animation: 'vv-pulse 1.8s ease-in-out infinite' }}
                  >
                    vv
                  </span>
                </div>
              </div>

              <div className="mb-5 h-0.5 w-40 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="font-serif text-lg font-semibold text-ink">Preparando sua Cabine</div>
              <div
                key={msgIdx}
                className="mt-2 text-[13px] text-ink-3 transition-opacity"
                style={{ animation: 'vv-fade-msg 0.4s ease' }}
              >
                {LOADING_MESSAGES[msgIdx]}
              </div>

              <style>{`
                @keyframes vv-fade-msg {
                  from { opacity: 0; transform: translateY(4px); }
                  to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes vv-breathe {
                  0%, 100% { transform: scale(0.95); opacity: 0.6; }
                  50%      { transform: scale(1.08); opacity: 1; }
                }
                @keyframes vv-pulse {
                  0%, 100% { opacity: 0.6; }
                  50%      { opacity: 1; }
                }
              `}</style>
            </div>
          ) : null}

          {step === 'result' && resultUrl ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-light text-success">
                  <Check size={13} />
                </span>
                <span className="text-sm font-medium text-ink">Pronto.</span>
              </div>

              <div className="relative overflow-hidden rounded-modal border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resultUrl}
                  alt="Resultado da Cabine"
                  className="aspect-[3/4] w-full object-cover"
                />
                {/* Watermark minimalista — sinaliza que é simulação */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-2 right-2 select-none rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-white backdrop-blur-sm"
                >
                  Simulação
                </span>
              </div>

              <p className="text-center text-xs text-ink-3">
                Imagem gerada por simulação. Expira em até 24 horas.
              </p>
            </div>
          ) : null}

          {step === 'error' ? (
            <div className="flex min-h-full flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 font-serif text-lg font-semibold">Não foi possível gerar agora</div>
              <p className="mb-4 max-w-[340px] text-sm text-ink-3">
                {errorMsg ?? 'Tente novamente em instantes com outra foto.'}
              </p>
            </div>
          ) : null}
        </div>

        {step !== 'loading' ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-surface px-4 py-4 sm:px-6">
            {renderFooter()}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function PhotoField({
  title,
  helper,
  previewUrl,
  error,
  onCamera,
  onGallery,
}: {
  title: string
  helper: string
  previewUrl: string | null
  error: string | null
  onCamera: () => void
  onGallery: () => void
}) {
  return (
    <div className="rounded-modal border border-border bg-surface-2 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-ink">{title}</div>
          <div className="mt-1 text-xs leading-relaxed text-ink-3">{helper}</div>
        </div>
        <span className="rounded-full bg-white p-2 text-accent">
          <UserRound size={16} />
        </span>
      </div>

      <div className="mb-3 overflow-hidden rounded-modal bg-[#efe7de]">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={title} className="aspect-[3/4] w-full object-cover object-center" />
        ) : (
          <div className="flex aspect-[3/4] items-center justify-center text-ink-3">
            <ImageIcon size={24} />
          </div>
        )}
      </div>

      {error ? <p className="mb-3 text-xs text-danger">{error}</p> : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button variant="ghost" onClick={onCamera}>
          <ImageIcon size={15} />
          Tirar foto
        </Button>
        <Button variant="ghost" onClick={onGallery}>
          <ImageIcon size={15} />
          Escolher arquivo
        </Button>
      </div>
    </div>
  )
}

function PreviewCard({
  label,
  src,
  alt,
  fallback,
}: {
  label: string
  src: string | null
  alt: string
  fallback?: string
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-ink-3">{label}</div>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="aspect-[3/4] w-full rounded-modal object-cover object-center" />
      ) : (
        <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-modal bg-[#f0ebe3]">
          <ImageOff size={20} className="text-ink-3" />
          {fallback ? <span className="px-2 text-center text-xs text-ink-3">{fallback}</span> : null}
        </div>
      )}
    </div>
  )
}

function cleanupSelection(photo: SelectedPhoto | null) {
  if (photo?.previewUrl) URL.revokeObjectURL(photo.previewUrl)
}
