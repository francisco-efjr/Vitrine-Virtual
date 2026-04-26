'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Image as ImageIcon, X, Check, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildVitrineMessage, buildWhatsAppUrl } from '@/lib/whatsapp/link'

type Step = 'choose' | 'preview' | 'loading' | 'result' | 'error'

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 'choose', label: 'Escolher foto' },
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
}: {
  open: boolean
  onClose: () => void
  pecaId: string
  pecaNome: string
  whatsappE164: string | null
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

  // ESC + scroll lock
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', handler)
    }
  }, [open, onClose])

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep('choose')
        setAgreed(false)
        setPhotoFile(null)
        setPhotoPreview(null)
        setProgress(0)
        setResultUrl(null)
        setErrorMsg(null)
      }, 300)
      return () => clearTimeout(t)
    }
  }, [open])

  function handleFile(f: File | null) {
    if (!f) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      setErrorMsg('Use uma foto JPEG, PNG ou WebP.')
      return
    }
    if (f.size > 8 * 1024 * 1024) {
      setErrorMsg('Foto maior que 8 MB.')
      return
    }
    setPhotoFile(f)
    setPhotoPreview(URL.createObjectURL(f))
    setStep('preview')
  }

  async function handleGenerate() {
    if (!photoFile) return
    setStep('loading')
    setProgress(0)
    setErrorMsg(null)

    // Animação de progresso enquanto a request acontece
    const interval = setInterval(() => {
      setProgress((p) => Math.min(95, p + Math.random() * 7 + 2))
    }, 400)

    try {
      const formData = new FormData()
      formData.set('peca_id', pecaId)
      formData.set('consent', 'true')
      // TODO: integrar Cloudflare Turnstile no front e popular este token
      formData.set('turnstile_token', 'dev-bypass')
      formData.set('foto', photoFile)

      const res = await fetch('/api/try-on', { method: 'POST', body: formData })
      const data = await res.json()
      clearInterval(interval)

      if (!res.ok || !data?.ok) {
        const msg = data?.error?.message ?? 'Não foi possível gerar agora.'
        setErrorMsg(msg)
        setStep('error')
        return
      }
      setProgress(100)
      setResultUrl(data.data.result_url)
      setTimeout(() => setStep('result'), 300)
    } catch {
      clearInterval(interval)
      setErrorMsg('Erro de conexão. Tente novamente.')
      setStep('error')
    }
  }

  if (!open) return null

  const currentStepIndex = STEPS.findIndex((s) => s.id === step)
  const waUrl = whatsappE164
    ? buildWhatsAppUrl(whatsappE164, buildVitrineMessage({ pecaNome }))
    : null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Provador virtual"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,16,14,0.7)] p-5 backdrop-blur"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[480px] flex-col overflow-hidden rounded-modal bg-surface shadow-modal"
      >
        {/* Header */}
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

        {/* Stepper */}
        <div className="flex items-center gap-1.5 px-6 py-3.5">
          {STEPS.map((s, i) => {
            const done = i < currentStepIndex || step === 'result'
            const active = i === currentStepIndex
            return (
              <div key={s.id} className="flex flex-1 items-center gap-1.5">
                <div
                  className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    done
                      ? 'bg-success text-white'
                      : active
                        ? 'bg-accent text-white'
                        : 'bg-border text-ink-3'
                  }`}
                >
                  {done ? <Check size={11} /> : i + 1}
                </div>
                <span
                  className={`hidden text-xs sm:inline ${
                    active ? 'font-semibold text-ink' : 'text-ink-3'
                  }`}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 ? (
                  <div className={`h-px flex-1 ${done ? 'bg-success' : 'bg-border'}`} />
                ) : null}
              </div>
            )
          })}
        </div>

        {/* Content */}
        <div className="min-h-[340px] px-6 pb-6 pt-2">
          {step === 'choose' ? (
            <div>
              <div className="mb-4">
                <div className="text-sm font-medium">Como você quer enviar sua foto?</div>
                <div className="mt-1 text-[13px] text-ink-3">
                  Sua foto não será armazenada. É usada apenas para gerar a simulação.
                </div>
              </div>
              <div className="mb-5 grid grid-cols-2 gap-3">
                <ChoiceTile
                  label="Tirar foto"
                  sub="Use a câmera agora"
                  icon={<Camera size={28} />}
                  disabled={!agreed}
                  onClick={() => cameraInputRef.current?.click()}
                />
                <ChoiceTile
                  label="Galeria"
                  sub="Escolha do celular"
                  icon={<ImageIcon size={28} />}
                  disabled={!agreed}
                  onClick={() => galleryInputRef.current?.click()}
                />
              </div>
              <input
                type="file"
                accept="image/*"
                capture="user"
                ref={cameraInputRef}
                hidden
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              <input
                type="file"
                accept="image/*"
                ref={galleryInputRef}
                hidden
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => setAgreed(!agreed)}
                className="mb-4 flex w-full items-start gap-2.5 rounded-[10px] bg-accent-light p-3 text-left"
              >
                <span
                  className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2 ${
                    agreed ? 'border-accent bg-accent' : 'border-border-2 bg-white'
                  }`}
                  aria-hidden="true"
                >
                  {agreed ? <Check size={11} className="text-white" /> : null}
                </span>
                <span className="text-xs leading-relaxed text-ink-2">
                  Concordo com o uso da minha foto para gerar a simulação. Ela não será armazenada
                  após o processamento.
                </span>
              </button>
              <p className="text-center text-[11px] text-ink-3">
                Dúvidas? Leia nossa{' '}
                <a href="/privacidade" className="text-accent underline" target="_blank">
                  política de privacidade
                </a>
                .
              </p>
              {errorMsg ? (
                <p className="mt-3 text-center text-sm text-danger">{errorMsg}</p>
              ) : null}
            </div>
          ) : null}

          {step === 'preview' && photoPreview ? (
            <div>
              <div className="mb-3 text-sm text-ink-2">Foto selecionada:</div>
              <div className="mb-5 grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1.5 text-xs text-ink-3">Sua foto</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreview}
                    alt="Foto enviada"
                    className="h-[200px] w-full rounded-modal object-cover"
                  />
                </div>
                <div>
                  <div className="mb-1.5 text-xs text-ink-3">Peça</div>
                  <div className="flex h-[200px] items-center justify-center rounded-modal bg-[#f0ebe3] text-xs text-ink-3">
                    {pecaNome}
                  </div>
                </div>
              </div>
              <div className="mb-5 rounded-[10px] bg-surface-2 px-4 py-3 text-xs text-ink-2">
                ✓ Foto validada · ✓ Formato aceito · ✓ Tamanho adequado
              </div>
              <div className="flex gap-2.5">
                <Button variant="ghost" onClick={() => setStep('choose')}>
                  Trocar foto
                </Button>
                <Button variant="dark" onClick={handleGenerate} className="flex-1">
                  Gerar simulação ✦
                </Button>
              </div>
            </div>
          ) : null}

          {step === 'loading' ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative mb-6 h-20 w-20">
                <svg width="80" height="80" viewBox="0 0 80 80" className="animate-spin" style={{ animationDuration: '2s' }}>
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
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-serif text-lg font-semibold">
                  {Math.round(progress)}%
                </div>
              </div>
              <div className="font-serif text-lg font-semibold">Gerando sua prova virtual</div>
              <div className="mt-2 text-center text-[13px] leading-relaxed text-ink-3">
                Nossa IA está combinando sua foto
                <br />
                com a peça selecionada
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
                  alt="Simulação gerada"
                  className="w-full rounded-modal border-2 border-accent"
                />
              </div>
              <div className="flex flex-col gap-2.5">
                {waUrl ? (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-success px-6 py-3 text-base font-medium text-white transition hover:bg-[#5a8a67]"
                  >
                    <MessageCircle size={16} />
                    Tenho interesse — falar no WhatsApp
                  </a>
                ) : null}
                <Button variant="ghost" size="sm" onClick={() => setStep('choose')}>
                  Provar outra peça
                </Button>
              </div>
              <div className="mt-3 text-center text-[11px] text-ink-3">
                A imagem não é armazenada e expirará em 24h.
              </div>
            </div>
          ) : null}

          {step === 'error' ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 text-3xl">😕</div>
              <div className="font-serif text-lg font-semibold">Não foi possível gerar agora</div>
              <p className="mt-2 max-w-xs text-sm text-ink-2">
                {errorMsg ?? 'Tente novamente em alguns instantes.'}
              </p>
              <Button variant="dark" onClick={() => setStep('choose')} className="mt-5">
                Tentar de novo
              </Button>
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
  onClick,
  disabled,
}: {
  label: string
  sub: string
  icon: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-2 rounded-modal border-2 border-border bg-surface-2 p-5 text-center transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="text-ink-2">{icon}</span>
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xs text-ink-3">{sub}</span>
    </button>
  )
}
