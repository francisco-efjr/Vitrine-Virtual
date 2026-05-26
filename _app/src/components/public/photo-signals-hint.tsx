'use client'

import { useState } from 'react'
import { AlertTriangle, Check, Eye, Info, Lock, RefreshCcw } from 'lucide-react'

/**
 * P2-08 (v6): hint reutilizável sobre a foto do cliente.
 *
 * Um único componente, 4 variants. Consome `faceVisibility` (ou um sinal
 * equivalente do MediaPipe) e renderiza a mensagem certa:
 *
 *   • `> 0.8`  → success (reforço visual silencioso)
 *   • `0.4–0.8` → warning-soft (sugere reupload, mas deixa passar)
 *   • `< 0.4`  → warning-strong (gated CTA, mesmo padrão do P0-01)
 *   • signals ainda não chegaram → loading (timeout sugerido: 3s)
 *
 * Substitui três componentes ad-hoc do backlog (P1 PhotoQualityHint,
 * P2 FacePartialHint, e o `FaceWarning` inline do try-on-modal). O
 * try-on-modal continua usando o `FaceWarning` interno para o caso
 * estritamente "warning-strong + gated CTA", mas o resto da UI pode
 * usar este componente para mostrar o mesmo sinal em outros pontos
 * (ex.: detalhe da peça, configuração de assets, batch upload do admin).
 */

export type PhotoSignalsVariant =
  | 'loading'
  | 'success'
  | 'warning-soft'
  | 'warning-strong'

/**
 * Helper: mapa de `faceVisibility` (ou heurística equivalente) → variant.
 *
 * Aceita `ready=false` enquanto o MediaPipe ainda inicializa.
 */
export function pickPhotoSignalsVariant({
  ready,
  faceVisibility,
}: {
  ready: boolean
  faceVisibility: number
}): PhotoSignalsVariant {
  if (!ready) return 'loading'
  if (faceVisibility > 0.8) return 'success'
  if (faceVisibility >= 0.4) return 'warning-soft'
  return 'warning-strong'
}

interface PhotoSignalsHintProps {
  variant: PhotoSignalsVariant
  /** Mostrar versão compacta (sem CTAs nos warnings). Default: false. */
  compact?: boolean
  /**
   * Callback do CTA "Enviar outra foto". Só usado nas variants warning-*.
   */
  onReupload?: () => void
  /**
   * Callback do gated CTA "Continuar mesmo assim". Só usado nas variants
   * warning-*. O componente gerencia o consent internamente.
   */
  onContinueAnyway?: () => void
  className?: string
}

const COPY: Record<
  PhotoSignalsVariant,
  { title: string; sub: string }
> = {
  loading: {
    title: 'Estamos analisando sua foto…',
    sub: 'Leva uns segundinhos',
  },
  success: {
    title: 'Sua foto está ótima',
    sub: 'Corpo inteiro, boa luz, rosto visível',
  },
  'warning-soft': {
    title: 'Mostre seu rosto inteiro para um resultado melhor',
    sub: 'Detectamos parte do rosto — vai funcionar, mas pode ficar melhor',
  },
  'warning-strong': {
    title: 'Não conseguimos identificar bem o rosto',
    sub: 'Tente uma foto com mais luz e o rosto visível',
  },
}

export function PhotoSignalsHint({
  variant,
  compact = false,
  onReupload,
  onContinueAnyway,
  className,
}: PhotoSignalsHintProps) {
  // Consentimento local (apenas warnings). Mesmo padrão do FaceWarning P0-01.
  const [consented, setConsented] = useState(false)

  const showCta =
    !compact && (variant === 'warning-soft' || variant === 'warning-strong')
  const { title, sub } = COPY[variant]

  // Paleta por variant — token-aligned com tailwind.config.ts e o canvas v6.
  const styleByVariant: Record<
    PhotoSignalsVariant,
    { bg: string; border: string; icon: React.ReactNode; titleStyle?: string }
  > = {
    loading: {
      bg: '#ffffff',
      border: '#e6dfd6',
      icon: (
        <svg
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6d6460"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
          style={{ animation: 'vv-spin 1.2s linear infinite' }}
        >
          <circle cx="12" cy="12" r="9" opacity=".25" />
          <path d="M21 12a9 9 0 0 1-9 9" />
        </svg>
      ),
    },
    success: {
      bg: '#e8f3eb',
      border: '#cae0d0',
      icon: (
        <div
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-success text-white"
          aria-hidden="true"
        >
          <Check size={13} strokeWidth={3} />
        </div>
      ),
      titleStyle: 'italic',
    },
    'warning-soft': {
      bg: '#fbf2e2',
      border: '#ead8b8',
      icon: (
        <div
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-white"
          style={{ background: '#e3b67a' }}
          aria-hidden="true"
        >
          <Eye size={12} />
        </div>
      ),
    },
    'warning-strong': {
      bg: '#faf0e0',
      border: '#ead2a6',
      icon: (
        <div
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-warning text-white"
          aria-hidden="true"
        >
          <AlertTriangle size={11} />
        </div>
      ),
    },
  }
  const s = styleByVariant[variant]
  const canContinue = consented

  return (
    <div
      className={[
        'rounded-[14px] border p-4 font-sans',
        className ?? '',
      ].join(' ')}
      style={{
        background: s.bg,
        borderColor: s.border,
        animation:
          variant === 'success'
            ? 'vv-pop 0.5s var(--e-out) both'
            : 'vv-fade-up 0.3s var(--e-out) both',
      }}
      role={variant.startsWith('warning') ? 'alert' : 'status'}
      aria-live={variant.startsWith('warning') ? 'polite' : 'off'}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0">{s.icon}</div>
        <div className="min-w-0 flex-1">
          <div
            className={[
              'font-serif text-[14.5px] leading-snug tracking-tight text-ink',
              s.titleStyle === 'italic' ? 'italic' : '',
            ].join(' ')}
          >
            {title}
          </div>
          <div className="mt-1 font-sans text-[12px] leading-snug text-ink-2">
            {sub}
          </div>
        </div>
      </div>

      {showCta ? (
        <div className="mt-3 flex flex-col gap-2">
          {/* Quality ack inline (mesmo padrão do P0-01). */}
          <button
            type="button"
            role="checkbox"
            aria-checked={consented}
            onClick={() => setConsented((v) => !v)}
            className="flex w-full items-start gap-2.5 rounded-[10px] border px-3 py-2 text-left transition"
            style={{
              borderColor: consented ? '#b8956a' : '#e6dfd6',
              background: consented ? '#f2e8d8' : '#ffffff',
            }}
          >
            <span
              className="mt-0.5 flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[4px] transition"
              style={{
                border: `1.5px solid ${consented ? '#b8956a' : '#d4cbc0'}`,
                background: consented ? '#b8956a' : '#ffffff',
              }}
              aria-hidden="true"
            >
              {consented ? <Check size={10} strokeWidth={3} className="text-white" /> : null}
            </span>
            <span className="font-sans text-[11.5px] leading-snug text-ink-2">
              Entendo que o resultado pode ter qualidade reduzida.
            </span>
          </button>

          <button
            type="button"
            onClick={onContinueAnyway}
            disabled={!canContinue}
            aria-disabled={!canContinue}
            className="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 font-sans text-[12.5px] font-medium transition disabled:cursor-not-allowed"
            style={
              canContinue
                ? { background: '#1e1a17', color: '#ffffff', border: '1px solid #1e1a17' }
                : {
                    background: 'transparent',
                    color: '#b0a59d',
                    border: '1.5px dashed #d4cbc0',
                  }
            }
          >
            {!canContinue ? <Lock size={11} aria-hidden="true" /> : null}
            {canContinue ? 'Continuar mesmo assim' : 'Marque o consentimento acima'}
          </button>

          <button
            type="button"
            onClick={onReupload}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-2 font-sans text-[12.5px] font-medium text-white transition hover:bg-accent-dark"
          >
            <RefreshCcw size={11} aria-hidden="true" />
            Enviar outra foto
          </button>
        </div>
      ) : null}
    </div>
  )
}

// Re-export the loose icon for downstream uses that want to render
// supplementary info chips next to the hint.
export { Info as PhotoSignalsInfoIcon }
