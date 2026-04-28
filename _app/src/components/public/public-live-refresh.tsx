'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function PublicLiveRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  useEffect(() => {
    function refreshIfVisible() {
      if (document.visibilityState !== 'visible') return
      startTransition(() => router.refresh())
    }

    const interval = window.setInterval(refreshIfVisible, intervalMs)
    window.addEventListener('focus', refreshIfVisible)
    document.addEventListener('visibilitychange', refreshIfVisible)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshIfVisible)
      document.removeEventListener('visibilitychange', refreshIfVisible)
    }
  }, [intervalMs, router, startTransition])

  return null
}
