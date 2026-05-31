/**
 * Casa Gaby Harb — átomos visuais do tema.
 *
 * Reproduz, em React + Tailwind/inline styles, o conjunto do designer
 * (_design/vitrine-virtual/project/cgh/brand.jsx): monograma GH, wordmark,
 * eyebrow, floron, gold rule, ícones em linha fina (joia, não material),
 * botões, nav, FAB do WhatsApp.
 *
 * Sem dependências do tailwind.config.ts (que está calibrado pro tema
 * default — bodoni/manrope/ouro-taupe). Usamos `var(--font-cgh-*)` injetadas
 * por `fonts.ts`.
 */
import type { CSSProperties, ReactNode } from 'react'
import { CGH, GOLD_FOIL } from './tokens'

export const FF = {
  serif: 'var(--font-cgh-serif), Georgia, serif',
  sans: 'var(--font-cgh-sans), ui-sans-serif, system-ui, sans-serif',
  script: 'var(--font-cgh-script), "Snell Roundhand", cursive',
  mono: '"JetBrains Mono", ui-monospace, monospace',
}

/* ── GH monogram — gold script com clip de gold-foil ──────────────────── */
export function GHMono({ size = 40, style = {} }: { size?: number; style?: CSSProperties }) {
  return (
    <span
      style={{
        fontFamily: FF.script,
        fontSize: size,
        lineHeight: 0.9,
        background: GOLD_FOIL,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        color: CGH.gold,
        display: 'inline-block',
        paddingRight: size * 0.08,
        ...style,
      }}
    >
      GH
    </span>
  )
}

/* ── Wordmark — "casa  GH  GABY HARB" lockup ──────────────────────────── */
export function Wordmark({
  color = CGH.cream,
  size = 13,
  mono = true,
  align = 'center',
}: {
  color?: string
  size?: number
  mono?: boolean
  align?: CSSProperties['justifyContent']
}) {
  const cap: CSSProperties = {
    fontFamily: FF.sans,
    fontWeight: 300,
    letterSpacing: '0.34em',
    fontSize: size,
    color,
    textTransform: 'uppercase',
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.7,
        justifyContent: align,
      }}
    >
      <span style={{ ...cap, fontStyle: 'normal' }}>casa</span>
      {mono ? <GHMono size={size * 1.9} /> : null}
      <span style={cap}>Gaby&nbsp;Harb</span>
    </span>
  )
}

/* ── Section label — caps espaçado com tick dourado ───────────────────── */
export function Eyebrow({
  children,
  color = CGH.gold,
  center = false,
}: {
  children: ReactNode
  color?: string
  center?: boolean
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        justifyContent: center ? 'center' : 'flex-start',
      }}
    >
      <span style={{ width: 22, height: 1, background: color, opacity: 0.8 }} />
      <span
        style={{
          fontFamily: FF.sans,
          fontWeight: 500,
          fontSize: 11.5,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color,
        }}
      >
        {children}
      </span>
    </span>
  )
}

/* ── Floron — ornamento centralizado pra divisores ────────────────────── */
export function Floron({ color = CGH.gold, size = 9 }: { color?: string; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color }}>
      <span style={{ width: size * 0.7, height: 1, background: 'currentColor', opacity: 0.55 }} />
      <span
        style={{
          width: size,
          height: size,
          border: '1px solid currentColor',
          transform: 'rotate(45deg)',
          display: 'inline-block',
        }}
      />
      <span style={{ width: size * 0.7, height: 1, background: 'currentColor', opacity: 0.55 }} />
    </span>
  )
}

/* ── Gold rule, opcional com floron central ───────────────────────────── */
export function GoldRule({
  color = CGH.gold,
  opacity = 0.4,
  floron = false,
  width = '100%',
  margin = '0',
}: {
  color?: string
  opacity?: number
  floron?: boolean
  width?: CSSProperties['width']
  margin?: CSSProperties['margin']
}) {
  if (!floron) return <div style={{ width, height: 1, background: color, opacity, margin }} />
  return (
    <div style={{ width, display: 'flex', alignItems: 'center', gap: 14, margin }}>
      <div style={{ flex: 1, height: 1, background: color, opacity }} />
      <Floron color={color} />
      <div style={{ flex: 1, height: 1, background: color, opacity }} />
    </div>
  )
}

/* ── Ícones linha fina (1.5px, ponta arredondada) ─────────────────────── */
type IconName =
  | 'whatsapp'
  | 'share'
  | 'arrowR'
  | 'arrowL'
  | 'bookmark'
  | 'sparkle'
  | 'camera'
  | 'upload'
  | 'chevD'
  | 'chevR'
  | 'plus'
  | 'x'
  | 'pin'
  | 'instagram'
  | 'download'
  | 'shield'
  | 'refresh'
  | 'alert'
  | 'ruler'
  | 'check'
  | 'scan'
  | 'bag'

export function Icon({
  name,
  size = 20,
  stroke = 1.5,
  color = 'currentColor',
  style = {},
}: {
  name: IconName
  size?: number
  stroke?: number
  color?: string
  style?: CSSProperties
}) {
  const p = {
    fill: 'none' as const,
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  const paths: Record<IconName, ReactNode> = {
    whatsapp: (
      <>
        <path {...p} d="M5 19l1-3.2A7.2 7.2 0 1 1 8.8 18L5 19z" />
        <path
          {...p}
          d="M9 9.2c0 2.6 2.2 4.8 4.8 4.8.5 0 .9-.4.9-.9 0-.2-.1-.4-.2-.5l-1.1-.7c-.2-.1-.5-.1-.6.1l-.4.5c-.9-.4-1.6-1.1-2-2l.5-.4c.2-.2.2-.4.1-.6l-.7-1.1c-.2-.2-.4-.3-.6-.3-.5 0-.9.4-.9.9z"
        />
      </>
    ),
    share: (
      <>
        <circle {...p} cx="6" cy="12" r="2.1" />
        <circle {...p} cx="17" cy="6" r="2.1" />
        <circle {...p} cx="17" cy="18" r="2.1" />
        <path {...p} d="M8 11l7-3.7M8 13l7 3.7" />
      </>
    ),
    arrowR: <path {...p} d="M5 12h13m-5-5l5 5-5 5" />,
    arrowL: <path {...p} d="M19 12H6m5 5l-5-5 5-5" />,
    bookmark: <path {...p} d="M7 5h10v14l-5-3.5L7 19z" />,
    sparkle: (
      <>
        <path {...p} d="M12 4l1.4 4.6L18 10l-4.6 1.4L12 16l-1.4-4.6L6 10l4.6-1.4z" />
        <path {...p} d="M18.5 15l.6 1.9 1.9.6-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6z" />
      </>
    ),
    camera: (
      <>
        <path {...p} d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
        <circle {...p} cx="12" cy="13" r="3.2" />
      </>
    ),
    upload: (
      <>
        <path {...p} d="M12 15V4m-4 4l4-4 4 4" />
        <path {...p} d="M5 16v3h14v-3" />
      </>
    ),
    chevD: <path {...p} d="M5 9l7 7 7-7" />,
    chevR: <path {...p} d="M9 5l7 7-7 7" />,
    plus: <path {...p} d="M12 5v14M5 12h14" />,
    x: <path {...p} d="M6 6l12 12M18 6L6 18" />,
    pin: (
      <>
        <path {...p} d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
        <circle {...p} cx="12" cy="10" r="2.4" />
      </>
    ),
    instagram: (
      <>
        <rect {...p} x="4" y="4" width="16" height="16" rx="4.5" />
        <circle {...p} cx="12" cy="12" r="3.4" />
        <circle cx="17" cy="7" r="1" fill={color} />
      </>
    ),
    download: (
      <>
        <path {...p} d="M12 4v11m-4-4l4 4 4-4" />
        <path {...p} d="M5 19h14" />
      </>
    ),
    shield: (
      <>
        <path {...p} d="M12 3l7 2.5V11c0 4.6-3 8-7 10-4-2-7-5.4-7-10V5.5z" />
        <path {...p} d="M9 12l2 2 4-4" />
      </>
    ),
    refresh: (
      <>
        <path {...p} d="M5 9a7 7 0 0 1 12-2.5L19 8m0-4v4h-4" />
        <path {...p} d="M19 15a7 7 0 0 1-12 2.5L5 16m0 4v-4h4" />
      </>
    ),
    alert: (
      <>
        <path {...p} d="M12 4l9 16H3z" />
        <path {...p} d="M12 10v4.5" />
        <circle cx="12" cy="17.5" r="0.9" fill={color} />
      </>
    ),
    ruler: (
      <>
        <rect {...p} x="3" y="8" width="18" height="8" rx="1.5" />
        <path {...p} d="M7 8v3m4-3v4m4-4v3m4-3v4" />
      </>
    ),
    check: <path {...p} d="M5 12.5l4.2 4.5L19 7" />,
    scan: (
      <>
        <path
          {...p}
          d="M4 8V6.5A2.5 2.5 0 0 1 6.5 4H8M16 4h1.5A2.5 2.5 0 0 1 20 6.5V8M20 16v1.5a2.5 2.5 0 0 1-2.5 2.5H16M8 20H6.5A2.5 2.5 0 0 1 4 17.5V16"
        />
        <path {...p} d="M4 12h16" />
      </>
    ),
    bag: (
      <>
        <path {...p} d="M6 8h12l-1 12H7z" />
        <path {...p} d="M9 8V6.5a3 3 0 0 1 6 0V8" />
      </>
    ),
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true">
      {paths[name] ?? null}
    </svg>
  )
}

/* ── Botões ──────────────────────────────────────────────────────────── */
type BtnVariant = 'gold' | 'ghostDark' | 'ghostLight' | 'solidDark'
type BtnSize = 'sm' | 'md' | 'lg'

export function Btn({
  children,
  variant = 'gold',
  icon,
  iconR,
  size = 'md',
  full = false,
  href,
  onClick,
  ariaLabel,
  style = {},
}: {
  children?: ReactNode
  variant?: BtnVariant
  icon?: IconName
  iconR?: IconName
  size?: BtnSize
  full?: boolean
  href?: string
  onClick?: () => void
  ariaLabel?: string
  style?: CSSProperties
}) {
  const pad = size === 'lg' ? '16px 30px' : size === 'sm' ? '9px 16px' : '13px 24px'
  const fs = size === 'lg' ? 13.5 : size === 'sm' ? 11.5 : 12.5
  const variants: Record<BtnVariant, CSSProperties> = {
    gold: {
      background: CGH.gold,
      color: CGH.musgoDeep,
      border: '1px solid transparent',
      fontWeight: 600,
    },
    ghostDark: {
      background: 'transparent',
      color: CGH.cream,
      border: `1px solid ${CGH.onDarkFaint}`,
      fontWeight: 500,
    },
    ghostLight: {
      background: 'transparent',
      color: CGH.musgo,
      border: '1px solid rgba(31,58,42,0.32)',
      fontWeight: 500,
    },
    solidDark: {
      background: CGH.musgo,
      color: CGH.cream,
      border: '1px solid transparent',
      fontWeight: 600,
    },
  }
  const common: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    padding: pad,
    borderRadius: 5,
    fontFamily: FF.sans,
    fontSize: fs,
    letterSpacing: '0.13em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    width: full ? '100%' : 'auto',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    ...variants[variant],
    ...style,
  }
  const inner = (
    <>
      {icon ? <Icon name={icon} size={fs + 4} stroke={1.5} /> : null}
      {children}
      {iconR ? <Icon name={iconR} size={fs + 4} stroke={1.5} /> : null}
    </>
  )
  if (href) {
    return (
      <a
        href={href}
        style={common}
        aria-label={ariaLabel}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel="noreferrer"
      >
        {inner}
      </a>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{ ...common, border: variants[variant].border }}
    >
      {inner}
    </button>
  )
}

export function WhatsBtn({
  size = 'md',
  full = false,
  label = 'Falar com a Casa',
  href,
  style = {},
}: {
  size?: BtnSize
  full?: boolean
  label?: string
  href?: string
  style?: CSSProperties
}) {
  return (
    <Btn variant="gold" icon="whatsapp" size={size} full={full} href={href} style={style}>
      {label}
    </Btn>
  )
}

/* ── Top nav (dark = sobre musgo · light = sobre creme) ───────────────── */
export function Nav({ theme = 'dark' }: { theme?: 'dark' | 'light' }) {
  const dark = theme === 'dark'
  const txt = dark ? CGH.cream : CGH.musgo
  const items: { label: string; href: string }[] = [
    { label: 'A curadoria', href: '#curadoria' },
    { label: 'Coleções', href: '#colecoes' },
    { label: 'A casa', href: '#a-casa' },
    { label: 'Provador', href: '#provador' },
  ]
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        height: 76,
        borderBottom: `1px solid ${dark ? 'rgba(201,169,97,0.22)' : 'rgba(31,58,42,0.12)'}`,
      }}
      className="cgh-nav"
    >
      <Wordmark color={txt} size={11} align="flex-start" />
      <div style={{ flex: 1 }} />
      <nav className="cgh-nav-links" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
        {items.map((it, i) => (
          <a
            key={it.label}
            href={it.href}
            style={{
              fontFamily: FF.sans,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.13em',
              textTransform: 'uppercase',
              color: i === 0 ? (dark ? CGH.gold : CGH.musgo) : dark ? CGH.onDarkMut : 'rgba(31,58,42,0.6)',
              textDecoration: 'none',
            }}
          >
            {it.label}
          </a>
        ))}
      </nav>
      <div
        className="cgh-nav-sep"
        style={{
          width: 1,
          height: 26,
          background: dark ? 'rgba(201,169,97,0.25)' : 'rgba(31,58,42,0.14)',
          margin: '0 24px',
        }}
      />
      <span style={{ display: 'inline-flex', gap: 18, color: txt }}>
        <Icon name="instagram" size={19} color={dark ? CGH.onDarkMut : 'rgba(31,58,42,0.6)'} />
        <Icon name="bag" size={19} color={dark ? CGH.onDarkMut : 'rgba(31,58,42,0.6)'} />
      </span>
    </div>
  )
}

/* ── FAB do WhatsApp (canto inferior direito, fixo) ───────────────────── */
export function WhatsFab({ href }: { href?: string | null }) {
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 11,
        background: CGH.gold,
        color: CGH.musgoDeep,
        padding: '12px 18px 12px 14px',
        borderRadius: 999,
        boxShadow: '0 10px 30px rgba(31,58,42,0.32)',
        zIndex: 40,
        textDecoration: 'none',
      }}
    >
      <Icon name="whatsapp" size={20} stroke={1.6} />
      <span
        style={{
          fontFamily: FF.sans,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Falar com a Casa
      </span>
    </a>
  )
}
