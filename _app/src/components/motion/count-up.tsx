'use client'

import { useEffect, useState } from 'react'
import { useReveal } from './reveal'

/**
 * CountUp — anima um número de 0 até `value` com easeOutCubic.
 * Só dispara quando o elemento entra na viewport (evita "perdi a animação").
 * Respeita prefers-reduced-motion: nesse caso, salta direto para o valor final.
 */
export function CountUp({
  value,
  duration = 1100,
  format = (v) => Math.round(v).toString(),
}: {
  value: number
  duration?: number
  format?: (v: number) => string
}) {
  const [ref, shown] = useReveal<HTMLSpanElement>({ threshold: 0.4 })
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!shown) return
    if (typeof window === 'undefined') {
      setCurrent(value)
      return
    }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setCurrent(value)
      return
    }
    let raf = 0
    let start: number | null = null
    const from = 0
    const to = value
    function tick(t: number) {
      if (start == null) start = t
      const progress = Math.min(1, (t - start) / duration)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(from + (to - from) * eased)
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [shown, value, duration])

  return <span ref={ref}>{format(current)}</span>
}
