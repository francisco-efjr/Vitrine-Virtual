'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Check, Image as ImageIcon, ImageOff, MessageCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildVitrineMessage, buildWhatsAppUrl } from '@/lib/whatsapp/link'

type Step = 'choose' | 'preview' | 'loading' | 'result' | 'error'

const STEPS: Array<{ id: Exclude<Step, 'error'>; label: string }> = [
  { id: 'choose', label: 'Sua foto' },
  { id: 'preview', label: 'Confirmar' },
  { id: 'loading', label: 'Processando' },
  { id: 'result', label: 'Resultado' },
]

export function TryOnModal({
  open,
  onClose,
  pecaId,
  pecaNome,
  whatsappE164,
  garmentImageUrl,
  garmentThumbUrl,
}: {
  open: boolean
  onClose: () => void
  pecaId: string
  pecaNome: string
  whatsappE164: string | null
  garmentImageUrl: string | null
  garmentThumbUrl: string | null
}) {
  const [step, setStep] = useState<Step>('choose')
  const [agreed, setAgreed] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
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
      document.body.style.overflow = prev
      document.body.style.paddingRight = prevPaddingRight
      document.removeEventListener('keydown', handler)
    }
  }, [open, onClose])

  useEffect(() => {
    if (open) return
    const currentPreview = photoPreview
    const timer = window.setTimeout(() => {
      setStep('choose')
      setAgreed(false)
      setPhotoFile(null)
      setPhotoPreview(null)
      setProgress(0)
      setResultUrl(null)
      setErrorMsg(null)
      if (currentPreview) URL.revokeObjectURL(currentPreview)
    }, 200)
    return () => window.clearTimeout(timer)
  }, [open, photoPreview])

  function handleFile(file: File | null) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMsg('Use uma foto JPEG, PNG ou WebP.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Foto maior que 8 MB.')
      return
    }

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
    }

    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setErrorMsg(null)
    setStep('preview')
  }

  async function handleGenerate() {
    if (!photoFile) return

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
      formData.set('foto', photoFile)
      if (garmentImageUrl) {
        formData.set('garment_url_override', garmentImageUrl)
      }

      const res = await fetch('/api/try-on', { method: 'POST', body: formData })
      const data = await res.json()
      window.clearInterval(interval)

      if (!res.ok || !data?.ok) {
        setErrorMsg(data?.error?.message ?? 'Não foi possível gerar agora.')
        setStep('error')
        return
      }

      setProgress(100)
      setResultUrl(data.data.result_url)
      window.setTimeout(() => setStep('result'), 250)
    } catch {
      window.clearInterval(interval)
      setErrorMsg('Erro de conexão. Tente novamente.')
      setStep('error')
    }
  }

  if (!open) return null

  const currentStepIndex = Math.max(0, STEPS.findIndex((item) => item.id === step))
  const waUrl = whatsappE164
    ? buildWhatsAppUrl(whatsappE164, buildVitrineMessage({ pecaNome }))
    : null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Provador virtual"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,16,14,0.7)] p-4 backdrop-blur sm:p-5"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[520px] flex-col overflow-hidden rounded-modal bg-surface shadow-modal"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <div className="font-serif text-xl font-semibold">Provador Virtual</div>
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

        <div className="flex items-center gap-1.5 px-6 py-3.5">
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
                <span
                  className={`hidden text-xs sm:inline ${
                    active ? 'font-semibold text-ink' : 'text-ink-3'
                  }`}
                >
                  {item.label}
                </span>
                {index < STEPS.length - 1 ? (
                  <div className={`h-px flex-1 ${done ? 'bg-success' : 'bg-border'}`} />
                ) : null}
              </div>
            )
          })}
        </div>

        <div className="min-h-[340px] px-4 pb-4 pt-2 sm:px-6 sm:pb-6">
          {step === 'choose' ? (
            <div>
              <div className="mb-4">
                <div className="text-sm font-medium">Envie uma foto sua para experimentar a peça</div>
                <div className="mt-1 text-[13px] text-ink-3">
                  Sua foto não será armazenada. Ela é usada apenas para gerar a simulação.
                </div>
              </div>

              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ChoiceTile
                  label="Tirar foto"
                  sub="Usar a câmera agora"
                  icon={<Camera size={28} />}
                  disabled={!agreed}
                  onClick={() => cameraInputRef.current?.click()}
                />
                <ChoiceTile
                  label="Da galeria"
                  sub="Escolher do celular"
                  icon={<ImageIcon size={28} />}
                  disabled={!agreed}
                  onClick={() => galleryInputRef.current?.click()}
                />
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                hidden
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />

              <button
                type="button"
                onClick={() => setAgreed((value) => !value)}
                className="mb-4 flex w-full items-start gap-2.5 rounded-[10px] bg-accent-light p-3 text-left"
              >
                <span
                  className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2 ${
                    agreed ? 'border-accent bg-accent' : 'border-border bg-white'
                  }`}
                >
                  {agreed ? <Check size={11} className="text-white" /> : null}
                </span>
                <span className="text-xs leading-relaxed text-ink-2">
                  Concordo que minha foto seja usada apenas para gerar a simulação e descartada após o processamento.
                </span>
              </button>

              <p className="text-center text-[11px] text-ink-3">
                Leia nossa{' '}
                <a href="/privacidade" className="text-accent underline" target="_blank" rel="noreferrer">
                  política de privacidade
                </a>
                .
              </p>

              {errorMsg ? <p className="mt-3 text-center text-sm text-danger">{errorMsg}</p> : null}
            </div>
          ) : null}

          {step === 'preview' && photoPreview ? (
            <div>
              <div className="mb-3 text-sm text-ink-2">Confirme as fotos antes de gerar:</div>
              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1.5 text-xs font-medium text-ink-3">Você</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreview}
                    alt="Sua foto"
                    className="h-[200px] w-full rounded-modal object-cover sm:h-[220px]"
                  />
                </div>
                <div>
                  <div className="mb-1.5 text-xs font-medium text-ink-3">Peça</div>
                  {garmentThumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={garmentThumbUrl}
                      alt={pecaNome}
                      className="h-[200px] w-full rounded-modal object-cover sm:h-[220px]"
                    />
                  ) : (
                    <div className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-modal bg-[#f0ebe3] sm:h-[220px]">
                      <ImageOff size={20} className="text-ink-3" />
                      <span className="px-2 text-center text-xs text-ink-3">{pecaNome}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-5 rounded-[10px] bg-surface-2 px-4 py-3 text-xs text-ink-2">
                Foto validada e pronta para processamento.
              </div>

              <div className="flex flex-col gap-2.5 sm:flex-row">
                <Button variant="ghost" onClick={() => setStep('choose')}>
                  Trocar foto
                </Button>
                <Button variant="dark" onClick={handleGenerate} className="flex-1">
                  Gerar simulacao
                </Button>
              </div>
            </div>
          ) : null}

          {step === 'loading' ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative mb-6 h-20 w-20">
                <svg
                  width="80"
                  height="80"
                  viewBox="0 0 80 80"
                  className="animate-spin"
                  style={{ animationDuration: '2s' }}
                >
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#e6dfd6" strokeWidth="4" />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="#b8956a"
                    strokeWidth="4"
                    strokeDasharray={`${progress * 2.14} 214`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.4s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-serif text-lg font-semibold">
                  {Math.round(progress)}%
                </div>
              </div>
              <div className="font-serif text-lg font-semibold">Gerando sua prova virtual</div>
              <div className="mt-2 text-center text-[13px] leading-relaxed text-ink-3">
                Nossa IA está combinando sua foto com a peça.
                <br />
                Isso pode levar alguns segundos.
              </div>
            </div>
          ) : null}

          {step === 'result' && resultUrl ? (
            <div>
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-light text-success">
                  <Check size={13} />
                </span>
                <span className="text-sm font-medium text-success">Prova gerada com sucesso!</span>
              </div>

              <div className="mb-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resultUrl}
                  alt="Simulação de você com a peça"
                  className="w-full rounded-modal border-2 border-accent"
                />
              </div>

              <p className="mb-4 text-center text-xs text-ink-3">
                Esta é uma simulação visual de apoio. A imagem expira em até 24h.
              </p>

              <div className="flex flex-col gap-2.5">
                {waUrl ? (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#25d366] px-6 py-3 text-base font-medium text-white transition hover:bg-[#1da855]"
                  >
                    <MessageCircle size={16} />
                    Gostei, falar no WhatsApp
                  </a>
                ) : null}

                <Button variant="ghost" onClick={() => setStep('choose')}>
                  Gerar outra
                </Button>
              </div>
            </div>
          ) : null}

          {step === 'error' ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
              <div className="mb-3 font-serif text-lg font-semibold">Nao foi possivel gerar agora</div>
              <p className="mb-5 max-w-[320px] text-sm text-ink-3">
                {errorMsg ?? 'Tente novamente em instantes com outra foto ou mais tarde.'}
              </p>
              <div className="flex w-full max-w-[320px] flex-col gap-2.5 sm:flex-row">
                <Button variant="ghost" className="flex-1" onClick={() => setStep('choose')}>
                  Voltar
                </Button>
                <Button variant="dark" className="flex-1" onClick={handleGenerate} disabled={!photoFile}>
                  Tentar de novo
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ChoiceTile({
  label,
  sub,
  icon,
  disabled,
  onClick,
}: {
  label: string
  sub: string
  icon: React.ReactNode
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[132px] flex-col items-center justify-center rounded-modal border border-border bg-surface-2 px-3 text-center transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="mb-3 text-accent">{icon}</span>
      <span className="text-sm font-medium text-ink">{label}</span>
      <span className="mt-1 text-xs text-ink-3">{sub}</span>
    </button>
  )
}
