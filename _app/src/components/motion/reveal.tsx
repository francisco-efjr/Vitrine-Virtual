'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Hook compartilhado: detecta entrada na viewport via IntersectionObserver.
 * Marca true uma única vez (não reverte) — alinhado ao comportamento do design.
 */
export function useReveal<T extends Element>(opts?: {
  threshold?: number
  rootMargin?: string
}) {
  const ref = useRef<T | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || shown) return
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      {
        threshold: opts?.threshold ?? 0.12,
        rootMargin: opts?.rootMargin ?? '0px 0px -40px 0px',
      },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [shown, opts?.threshold, opts?.rootMargin])

  return [ref, shown] as const
}

/**
 * Reveal — fade + rise único quando o elemento entra em tela.
 * `variant="blur"` faz blur-in cinematográfico (use com moderação).
 */
export function Reveal({
  children,
  delay = 0,
  variant = 'up',
  className,
  as: Tag = 'div',
}: {
  children: React.ReactNode
  delay?: number
  variant?: 'up' | 'blur' | 'fade'
  className?: string
  as?: keyof JSX.IntrinsicElements
}) {
  const [ref, shown] = useReveal<HTMLElement>()
  const cls =
    variant === 'blur' ? 'vv-blur-in' : variant === 'fade' ? 'vv-fade-in' : 'vv-reveal'
  const Component = Tag as React.ElementType
  return (
    <Component
      ref={ref}
      className={cn(shown ? cls : null, className)}
      style={{
        opacity: shown ? undefined : 0,
        animationDelay: `${delay}ms`,
      }}
    >
      {children}
    </Component>
  )
}
