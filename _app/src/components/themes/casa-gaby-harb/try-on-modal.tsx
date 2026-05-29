/**
 * Casa Gaby Harb — Cabine virtual (espelho da Casa).
 *
 * Versão CGH do TryOnModal: reusa o mesmo backend (/api/try-on) mas com
 * visual 100% editorial — fundo verde-musgo, monograma GH pulsando no
 * loading, gold-foil frame no resultado, copy em serif italic.
 *
 * Estados: intro (upload + LGPD) · processing · result · error.
 * "Tentar mesmo assim" disponível pros códigos GATE_* falso-positivos.
 *
 * Versão funcional simplificada — não inclui o pipeline MediaPipe client
 * (best-effort no padrão) nem o downloadSimulacaoComMarca. Resultado básico
 * com botões de Compartilhar (share API)/WhatsApp/Provar outra. Quem quiser
 * o pipeline completo continua usando o TryOnModal padrão.
 */
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CGH, GOLD_FOIL } from './tokens'
import { FF, Btn, GHMono, Icon, WhatsBtn, Wordmark } from './atoms'
import { cghFontsClass } from './fonts'

type Step = 'intro' | 'processing' | 'result' | 'error'
type SelectedPhoto = { file: File; previewUrl: string }

const BYPASSABLE_GATE_CODES = new Set([
  'GATE_MULTIPLE_PEOPLE',
  'GATE_NO_FACE',
  'GATE_TARGET_REGION_OCCLUDED',
])

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif'

interface CGHTryOnModalProps {
  open: boolean
  onClose: () => void
  pecaId: string
  pecaNome: string
  pecaTamanho: string | null
  pecaPrecoCentavos: number | null
  exibirPreco: boolean
  whatsappE164: string | null
  garmentImageUrl: string | null
  garmentThumbUrl: string | null
  cabineBackdropUrl: string | null
}

export function CGHTryOnModal({
  open,
  onClose,
  pecaId,
  pecaNome,
  pecaTamanho: _pecaTamanho,
  pecaPrecoCentavos,
  exibirPreco,
  whatsappE164,
  garmentImageUrl,
  garmentThumbUrl,
}: CGHTryOnModalProps) {
  const [step, setStep] = useState<Step>('intro')
  const [photo, setPhoto] = useState<SelectedPhoto | null>(null)
  const [consent, setConsent] = useState(false)
  const [showLgpd, setShowLgpd] = useState(false)
  const [progress, setProgress] = useState(0)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset quando o modal abre/fecha de novo
  useEffect(() => {
    if (open) {
      setStep('intro')
      setProgress(0)
      setResultUrl(null)
      setErrorMsg(null)
      setErrorCode(null)
    } else if (photo?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(photo.previewUrl)
      setPhoto(null)
      setConsent(false)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePick = useCallback((file: File | null) => {
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    setPhoto((prev) => {
      if (prev?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(prev.previewUrl)
      return { file, previewUrl }
    })
  }, [])

  const handleGenerate = useCallback(
    async (opts?: { bypassAiGate?: boolean }) => {
      if (!photo) return
      setStep('processing')
      setProgress(0)
      setErrorMsg(null)
      setErrorCode(null)

      const interval = window.setInterval(() => {
        setProgress((v) => Math.min(92, v + Math.random() * 6 + 2))
      }, 500)

      try {
        const formData = new FormData()
        formData.set('peca_id', pecaId)
        formData.set('consent', 'true')
        formData.set('turnstile_token', 'dev-bypass')
        formData.set('customerPhoto', photo.file)
        if (garmentImageUrl) formData.set('garment_url_override', garmentImageUrl)
        if (opts?.bypassAiGate) formData.set('bypass_ai_gate', 'true')

        const res = await fetch('/api/try-on', {
          method: 'POST',
          body: formData,
          cache: 'no-store',
        })
        const data = await res.json().catch(() => null)
        window.clearInterval(interval)

        if (!res.ok || !data?.ok) {
          const message =
            data?.error?.message ??
            `Não foi possível gerar a visualização agora. (HTTP ${res.status})`
          const code = typeof data?.error?.code === 'string' ? data.error.code : `HTTP_${res.status}`
          // eslint-disable-next-line no-console
          console.error('[cgh-try-on] erro', { status: res.status, code, message, data })
          setErrorMsg(message)
          setErrorCode(code)
          setStep('error')
          return
        }

        setProgress(100)
        setResultUrl(data.data.result_url)
        window.setTimeout(() => setStep('result'), 250)
      } catch (e) {
        window.clearInterval(interval)
        const detail = e instanceof Error ? e.message : String(e)
        // eslint-disable-next-line no-console
        console.error('[cgh-try-on] fetch falhou', { detail })
        setErrorMsg(`Erro de conexão. Tente novamente em instantes.${detail ? ` (${detail})` : ''}`)
        setErrorCode('NETWORK_ERROR')
        setStep('error')
      }
    },
    [photo, pecaId, garmentImageUrl],
  )

  // Compartilhar resultado via Web Share API (mobile principalmente)
  const handleShare = useCallback(async () => {
    if (!resultUrl) return
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${pecaNome} · Casa Gaby Harb`,
          text: 'Veja como ficou no espelho virtual da Casa.',
          url: resultUrl,
        })
      } else {
        await navigator.clipboard.writeText(resultUrl)
      }
    } catch {
      // user cancelou — silencioso
    }
  }, [resultUrl, pecaNome])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Espelho virtual da Casa"
      className={`${cghFontsClass}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: step === 'processing' || step === 'result' ? CGH.musgoDeep : CGH.musgo,
        overflowY: 'auto',
        fontFamily: FF.sans,
      }}
    >
      <style>{`@keyframes cgh-spin { to { transform: rotate(360deg); } }
        @keyframes cgh-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.06); opacity: 0.85; } }`}</style>

      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 22px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Wordmark color={CGH.cream} size={10} align="flex-start" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          style={{
            border: '1px solid rgba(245,239,230,0.25)',
            background: 'rgba(10,10,10,0.25)',
            color: CGH.cream,
            borderRadius: 999,
            width: 36,
            height: 36,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Icon name="x" size={16} />
        </button>
      </div>

      {step === 'intro' ? (
        <CGHIntroStep
          pecaNome={pecaNome}
          pecaPrecoCentavos={pecaPrecoCentavos}
          exibirPreco={exibirPreco}
          garmentThumbUrl={garmentThumbUrl}
          photo={photo}
          consent={consent}
          setConsent={setConsent}
          onPick={handlePick}
          onPickClick={() => fileInputRef.current?.click()}
          onGenerate={() => handleGenerate()}
          onOpenLgpd={() => setShowLgpd(true)}
        />
      ) : null}

      {step === 'processing' ? <CGHProcessingStep progress={progress} /> : null}

      {step === 'result' && resultUrl ? (
        <CGHResultStep
          resultUrl={resultUrl}
          pecaNome={pecaNome}
          pecaPrecoCentavos={pecaPrecoCentavos}
          exibirPreco={exibirPreco}
          whatsappE164={whatsappE164}
          onShare={handleShare}
          onRetry={() => {
            setStep('intro')
            setResultUrl(null)
          }}
        />
      ) : null}

      {step === 'error' ? (
        <CGHErrorStep
          message={errorMsg}
          code={errorCode}
          whatsappE164={whatsappE164}
          onBack={() => setStep('intro')}
          onRetry={() => handleGenerate()}
          onBypassRetry={() => handleGenerate({ bypassAiGate: true })}
          canRetry={!!photo}
        />
      ) : null}

      {showLgpd ? <CGHLgpdSheet onClose={() => setShowLgpd(false)} /> : null}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null
          e.target.value = ''
          handlePick(f)
        }}
      />
    </div>
  )
}

/* ── Intro: upload + LGPD consent ───────────────────────────────────── */
function CGHIntroStep({
  pecaNome,
  pecaPrecoCentavos,
  exibirPreco,
  garmentThumbUrl,
  photo,
  consent,
  setConsent,
  onPick,
  onPickClick,
  onGenerate,
  onOpenLgpd,
}: {
  pecaNome: string
  pecaPrecoCentavos: number | null
  exibirPreco: boolean
  garmentThumbUrl: string | null
  photo: SelectedPhoto | null
  consent: boolean
  setConsent: (v: boolean) => void
  onPick: (file: File | null) => void
  onPickClick: () => void
  onGenerate: () => void
  onOpenLgpd: () => void
}) {
  const canSubmit = !!photo && consent
  return (
    <div
      style={{
        maxWidth: 560,
        margin: '0 auto',
        padding: '8px 22px 60px',
        position: 'relative',
      }}
    >
      <div
        style={{
          fontFamily: FF.sans,
          fontSize: 11,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: CGH.gold,
          opacity: 0.95,
          marginBottom: 12,
        }}
      >
        — O espelho virtual da Casa
      </div>
      <h2
        style={{
          fontFamily: FF.serif,
          fontStyle: 'italic',
          fontWeight: 500,
          fontSize: 'clamp(38px, 7vw, 56px)',
          lineHeight: 1.04,
          color: CGH.cream,
          margin: '6px 0 14px',
        }}
      >
        Veja a peça vestida em <span style={{ color: CGH.gold }}>você</span>.
      </h2>
      <p
        style={{
          fontFamily: FF.serif,
          fontStyle: 'italic',
          fontSize: 17,
          lineHeight: 1.55,
          color: CGH.onDarkMut,
          margin: '0 0 22px',
        }}
      >
        Envie uma foto sua, escolha a peça, e veja como fica em segundos.
      </p>

      {/* Upload arch */}
      <div
        onClick={onPickClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onPickClick()
        }}
        style={{
          border: photo
            ? `1.5px solid ${CGH.gold}`
            : '1.5px dashed rgba(201,169,97,0.5)',
          borderRadius: '160px 160px 12px 12px',
          minHeight: 280,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          background: photo
            ? `center / cover no-repeat url('${photo.previewUrl}')`
            : 'rgba(10,10,10,0.18)',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {!photo ? (
          <>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 999,
                border: `1px solid ${CGH.gold}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="camera" size={26} color={CGH.gold} />
            </div>
            <span
              style={{
                fontFamily: FF.serif,
                fontStyle: 'italic',
                fontSize: 19,
                color: CGH.cream,
              }}
            >
              Tirar ou enviar uma foto
            </span>
            <span style={{ fontFamily: FF.sans, fontSize: 12, color: CGH.onDarkMut }}>
              de corpo inteiro, com boa luz
            </span>
          </>
        ) : (
          <div
            style={{
              position: 'absolute',
              right: 12,
              top: 12,
              background: 'rgba(10,10,10,0.55)',
              color: CGH.cream,
              borderRadius: 999,
              padding: '6px 12px',
              fontFamily: FF.sans,
              fontSize: 11,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Trocar foto
          </div>
        )}
      </div>

      {/* Peça escolhida */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginTop: 16,
          padding: '10px 12px',
          border: '1px solid rgba(201,169,97,0.22)',
          borderRadius: 8,
        }}
      >
        <div
          style={{
            width: 44,
            height: 56,
            borderRadius: 4,
            background: garmentThumbUrl
              ? `center / cover no-repeat url('${garmentThumbUrl}'), ${CGH.musgoDeep}`
              : CGH.musgoDeep,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: FF.serif,
              fontStyle: 'italic',
              fontSize: 16,
              color: CGH.cream,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {pecaNome}
          </div>
          <div
            style={{
              fontFamily: FF.sans,
              fontSize: 11,
              color: CGH.onDarkMut,
              letterSpacing: '0.04em',
            }}
          >
            peça escolhida
            {exibirPreco && pecaPrecoCentavos != null
              ? ` · R$ ${(pecaPrecoCentavos / 100).toFixed(2).replace('.', ',')}`
              : ''}
          </div>
        </div>
      </div>

      {/* Consent + CTA */}
      <label
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          marginTop: 16,
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          style={{
            width: 18,
            height: 18,
            marginTop: 1,
            accentColor: CGH.gold,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: FF.sans,
            fontSize: 12,
            lineHeight: 1.55,
            color: CGH.onDarkMut,
          }}
        >
          Concordo com o uso da minha foto para gerar a simulação. Ela é
          processada com segurança e descartada após o uso.{' '}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              onOpenLgpd()
            }}
            style={{
              background: 'transparent',
              border: 0,
              padding: 0,
              color: CGH.gold,
              borderBottom: `1px solid ${CGH.gold}`,
              cursor: 'pointer',
              fontFamily: FF.sans,
              fontSize: 12,
            }}
          >
            Saiba mais
          </button>
        </span>
      </label>

      <div style={{ marginTop: 18 }}>
        <Btn
          variant="gold"
          size="lg"
          full
          icon="sparkle"
          onClick={canSubmit ? onGenerate : undefined}
          style={!canSubmit ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
        >
          Provar no espelho
        </Btn>
      </div>

      <input
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}

/* ── Processing: monograma pulsing + spinner dourado ───────────────── */
function CGHProcessingStep({ progress }: { progress: number }) {
  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 22px',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 168,
          height: 168,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="168"
          height="168"
          viewBox="0 0 168 168"
          style={{
            position: 'absolute',
            inset: 0,
            animation: 'cgh-spin 2.6s linear infinite',
          }}
        >
          <circle
            cx="84"
            cy="84"
            r="78"
            fill="none"
            stroke="rgba(201,169,97,0.16)"
            strokeWidth="1"
          />
          <circle
            cx="84"
            cy="84"
            r="78"
            fill="none"
            stroke={CGH.gold}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="80 410"
          />
        </svg>
        <span style={{ animation: 'cgh-pulse 1.8s ease-in-out infinite' }}>
          <GHMono size={72} />
        </span>
      </div>
      <div
        style={{
          fontFamily: FF.serif,
          fontStyle: 'italic',
          fontSize: 26,
          color: CGH.cream,
          marginTop: 36,
          textAlign: 'center',
          lineHeight: 1.3,
          maxWidth: 360,
        }}
      >
        Um momento — a curadoria está chegando até você.
      </div>
      <span
        style={{
          fontFamily: FF.mono,
          fontSize: 10.5,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: CGH.onDarkMut,
          marginTop: 22,
        }}
      >
        Preparando o provador
      </span>
      <div
        style={{
          width: 240,
          height: 2,
          background: 'rgba(201,169,97,0.16)',
          borderRadius: 2,
          marginTop: 24,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.max(8, progress)}%`,
            height: '100%',
            background: GOLD_FOIL,
            borderRadius: 2,
            transition: 'width 300ms ease',
          }}
        />
      </div>
    </div>
  )
}

/* ── Resultado: foto em gold-foil frame + 3 CTAs ──────────────────── */
function CGHResultStep({
  resultUrl,
  pecaNome,
  pecaPrecoCentavos,
  exibirPreco,
  whatsappE164,
  onShare,
  onRetry,
}: {
  resultUrl: string
  pecaNome: string
  pecaPrecoCentavos: number | null
  exibirPreco: boolean
  whatsappE164: string | null
  onShare: () => void
  onRetry: () => void
}) {
  const wa = whatsappE164
    ? `https://wa.me/${whatsappE164.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Oi! Vi que ficou maravilhosa a peça "${pecaNome}" no provador da Casa.`,
      )}`
    : null

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 22px 60px',
      }}
    >
      <div
        style={{
          fontFamily: FF.serif,
          fontStyle: 'italic',
          fontSize: 26,
          color: CGH.cream,
          marginBottom: 18,
        }}
      >
        Ficou para você.
      </div>

      <div
        style={{
          padding: 8,
          background: GOLD_FOIL,
          borderRadius: 14,
          boxShadow: '0 24px 70px rgba(0,0,0,0.45)',
          maxWidth: 360,
          width: '100%',
        }}
      >
        <div
          style={{
            position: 'relative',
            borderRadius: 8,
            overflow: 'hidden',
            aspectRatio: '3 / 4',
            background: CGH.musgoDeep,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resultUrl}
            alt="Resultado do espelho virtual"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 14,
              bottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <GHMono size={24} />
            <span
              style={{
                fontFamily: FF.sans,
                fontSize: 9.5,
                fontWeight: 300,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: 'rgba(245,239,230,0.85)',
              }}
            >
              casa gaby harb
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          fontFamily: FF.serif,
          fontStyle: 'italic',
          fontSize: 20,
          color: CGH.cream,
          marginTop: 18,
          textAlign: 'center',
        }}
      >
        {pecaNome}
        {exibirPreco && pecaPrecoCentavos != null ? (
          <span
            style={{
              fontFamily: FF.sans,
              fontStyle: 'normal',
              fontSize: 13,
              color: CGH.onDarkMut,
              marginLeft: 8,
            }}
          >
            · R$ {(pecaPrecoCentavos / 100).toFixed(2).replace('.', ',')}
          </span>
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          marginTop: 22,
          justifyContent: 'center',
        }}
      >
        <Btn variant="ghostDark" icon="share" onClick={onShare}>
          Compartilhar
        </Btn>
        {wa ? <WhatsBtn href={wa} /> : null}
        <Btn variant="ghostDark" icon="refresh" onClick={onRetry}>
          Provar outra peça
        </Btn>
      </div>

      <a
        href={resultUrl}
        download={`casa-gaby-harb-${pecaNome.replace(/\s+/g, '-').toLowerCase()}.jpg`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 18,
          color: CGH.onDarkFaint,
          textDecoration: 'none',
        }}
      >
        <Icon name="download" size={14} />
        <span style={{ fontFamily: FF.sans, fontSize: 11.5 }}>
          Baixar imagem em alta para o story
        </span>
      </a>
    </div>
  )
}

/* ── Erro amigável ─────────────────────────────────────────────────── */
function CGHErrorStep({
  message,
  code,
  whatsappE164,
  onBack,
  onRetry,
  onBypassRetry,
  canRetry,
}: {
  message: string | null
  code: string | null
  whatsappE164: string | null
  onBack: () => void
  onRetry: () => void
  onBypassRetry: () => void
  canRetry: boolean
}) {
  const isBypassable = !!code && BYPASSABLE_GATE_CODES.has(code)
  const wa = whatsappE164
    ? `https://wa.me/${whatsappE164.replace(/\D/g, '')}?text=${encodeURIComponent(
        'Oi! Tive um probleminha no provador virtual e queria ajuda.',
      )}`
    : null

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 28px',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 999,
          border: '1px solid rgba(201,169,97,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 28,
        }}
      >
        <Icon name="alert" size={26} color={CGH.gold} stroke={1.4} />
      </div>
      <div
        style={{
          fontFamily: FF.serif,
          fontStyle: 'italic',
          fontWeight: 500,
          fontSize: 36,
          color: CGH.cream,
          lineHeight: 1.1,
          maxWidth: 380,
        }}
      >
        O espelho embaçou por um instante.
      </div>
      <p
        style={{
          fontFamily: FF.sans,
          fontSize: 14,
          lineHeight: 1.6,
          color: CGH.onDarkMut,
          marginTop: 16,
          maxWidth: 380,
        }}
      >
        {message ?? 'Tente com uma foto de corpo inteiro e boa luz.'}
      </p>
      {isBypassable ? (
        <p
          style={{
            fontFamily: FF.serif,
            fontStyle: 'italic',
            fontSize: 13,
            color: CGH.onDarkFaint,
            marginTop: 12,
            maxWidth: 360,
          }}
        >
          Se você é a única pessoa real na foto (e o que aparece atrás é
          manequim, espelho ou cartaz), pode tentar mesmo assim.
        </p>
      ) : null}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 11,
          marginTop: 26,
          width: '100%',
          maxWidth: 320,
        }}
      >
        <Btn
          variant="gold"
          size="lg"
          full
          icon="refresh"
          onClick={canRetry ? onRetry : undefined}
          style={!canRetry ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
        >
          Tentar novamente
        </Btn>
        {isBypassable ? (
          <Btn
            variant="ghostDark"
            size="lg"
            full
            icon="sparkle"
            onClick={canRetry ? onBypassRetry : undefined}
            style={!canRetry ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
          >
            Tentar mesmo assim
          </Btn>
        ) : null}
        {wa ? <WhatsBtn size="lg" full href={wa} label="Falar com a Casa" /> : null}
        <Btn variant="ghostDark" size="md" full onClick={onBack}>
          Voltar e escolher outra foto
        </Btn>
      </div>

      {code ? (
        <span
          style={{
            fontFamily: FF.mono,
            fontSize: 10,
            letterSpacing: '0.1em',
            color: CGH.onDarkFaint,
            marginTop: 22,
          }}
        >
          code · {code}
        </span>
      ) : null}
    </div>
  )
}

/* ── LGPD bottom sheet ─────────────────────────────────────────────── */
function CGHLgpdSheet({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2100,
        background: 'rgba(10,10,10,0.55)',
        display: 'flex',
        alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 600,
          margin: '0 auto',
          background: CGH.cream,
          borderRadius: '20px 20px 0 0',
          padding: '14px 26px 40px',
        }}
      >
        <div
          style={{
            width: 42,
            height: 4,
            borderRadius: 2,
            background: 'rgba(31,58,42,0.2)',
            margin: '0 auto 18px',
          }}
        />
        <div
          style={{
            fontFamily: FF.sans,
            fontSize: 11,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: CGH.caramelo,
            marginBottom: 8,
          }}
        >
          — Privacidade · LGPD
        </div>
        <h3
          style={{
            fontFamily: FF.serif,
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 32,
            color: CGH.musgo,
            lineHeight: 1.05,
            margin: '8px 0 22px',
          }}
        >
          Sua foto, com cuidado.
        </h3>

        <LgpdBullet icon="shield" title="Processada com segurança">
          Usada só para gerar o provador, em conexão criptografada.
        </LgpdBullet>
        <LgpdBullet icon="refresh" title="Descartada após o uso">
          Nada fica armazenado — apagada assim que o resultado é gerado.
        </LgpdBullet>
        <LgpdBullet icon="bookmark" title="Só sua">
          O resultado é seu. A Casa nunca publica sem o seu sim.
        </LgpdBullet>

        <div style={{ marginTop: 24 }}>
          <Btn variant="solidDark" size="lg" full onClick={onClose}>
            Entendi, continuar
          </Btn>
        </div>
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <a
            href="/privacidade"
            target="_blank"
            rel="noreferrer"
            style={{
              fontFamily: FF.sans,
              fontSize: 12,
              color: 'rgba(31,58,42,0.55)',
              borderBottom: '1px solid rgba(31,58,42,0.25)',
              textDecoration: 'none',
            }}
          >
            Ler a política completa
          </a>
        </div>
      </div>
    </div>
  )
}

function LgpdBullet({
  icon,
  title,
  children,
}: {
  icon: 'shield' | 'refresh' | 'bookmark'
  title: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          border: '1px solid rgba(31,58,42,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={17} color={CGH.musgo} />
      </div>
      <div>
        <div
          style={{
            fontFamily: FF.sans,
            fontSize: 13,
            fontWeight: 600,
            color: CGH.musgo,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: FF.sans,
            fontSize: 12.5,
            lineHeight: 1.55,
            color: 'rgba(31,58,42,0.62)',
            marginTop: 3,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
