import { VVLogo } from '@/components/brand/vv-logo'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Wrapper centralizado para telas de auth (login, recuperar, definir senha).
 * Mobile-first: o card cresce e centraliza naturalmente em qualquer largura.
 */
export function AuthShell({
  children,
  maxWidth = 400,
  className,
}: {
  children: React.ReactNode
  maxWidth?: number
  className?: string
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="w-full" style={{ maxWidth }}>
        <div className="mb-9 flex justify-center">
          <VVLogo size={32} />
        </div>
        <Card className={cn('p-8 sm:p-9', className)}>{children}</Card>
        <div className="mt-5 text-center text-[11px] text-ink-3">Vitrine Virtual · Versão 1.0</div>
      </div>
    </div>
  )
}
