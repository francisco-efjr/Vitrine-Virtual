'use client'

import { MessageCircle } from 'lucide-react'

/**
 * Botões de contato da vitrine pública (Instagram / TikTok / WhatsApp).
 *
 * Cada clique é registrado de forma assíncrona ANTES de o redirect acontecer,
 * via `navigator.sendBeacon` (fallback `fetch keepalive`). O beacon não bloqueia
 * a navegação — o link abre normalmente em nova aba. Se o tracking falhar, o
 * cliente nem percebe (o redirect é a prioridade).
 */
export function ContactLinks({
  lojaId,
  instagram,
  tiktok,
  whatsappUrl,
  variant,
}: {
  lojaId: string
  instagram: string | null
  tiktok: string | null
  whatsappUrl: string | null
  variant: 'header' | 'footer'
}) {
  const iconSize = variant === 'header' ? 16 : 18
  const baseBtn =
    variant === 'header'
      ? 'flex h-9 w-9 items-center justify-center rounded-full transition'
      : 'flex h-10 w-10 items-center justify-center rounded-full transition'
  const socialCls =
    variant === 'header'
      ? `${baseBtn} bg-surface-2 text-ink-2 hover:bg-surface-3 hover:text-ink`
      : `${baseBtn} bg-white/10 text-white hover:bg-white/20`
  const waCls = `${baseBtn} bg-[#25d366] text-white hover:bg-[#1fb155]`

  function track(channel: 'instagram' | 'tiktok' | 'whatsapp') {
    try {
      const payload = JSON.stringify({
        loja_id: lojaId,
        channel,
        session_id: getId('sessionStorage', 'vv_sid'),
        visitor_id: getId('localStorage', 'vv_vid'),
      })
      const url = '/api/track/contact'
      const sent =
        typeof navigator !== 'undefined' &&
        typeof navigator.sendBeacon === 'function' &&
        navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }))
      if (!sent) {
        void fetch(url, {
          method: 'POST',
          body: payload,
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          cache: 'no-store',
        }).catch(() => {})
      }
    } catch {
      /* tracking nunca quebra o redirect */
    }
  }

  return (
    <>
      {instagram ? (
        <a
          href={`https://instagram.com/${instagram}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          onClick={() => track('instagram')}
          onAuxClick={() => track('instagram')}
          className={socialCls}
        >
          <IconInstagram size={iconSize} />
        </a>
      ) : null}
      {tiktok ? (
        <a
          href={`https://tiktok.com/@${tiktok}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="TikTok"
          onClick={() => track('tiktok')}
          onAuxClick={() => track('tiktok')}
          className={socialCls}
        >
          <IconTikTok size={iconSize} />
        </a>
      ) : null}
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
          onClick={() => track('whatsapp')}
          onAuxClick={() => track('whatsapp')}
          className={waCls}
        >
          <MessageCircle size={iconSize} />
        </a>
      ) : null}
    </>
  )
}

function getId(store: 'sessionStorage' | 'localStorage', key: string): string | undefined {
  try {
    const s = window[store]
    let v = s.getItem(key)
    if (!v) {
      v = crypto.randomUUID()
      s.setItem(key, v)
    }
    return v
  } catch {
    return undefined
  }
}

function IconInstagram({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconTikTok({ size = 16 }: { size?: number }) {
  return (
    <svg width={size - 1} height={size - 1} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.78 1.52v-3.4a4.85 4.85 0 01-1.01-.12z" />
    </svg>
  )
}
