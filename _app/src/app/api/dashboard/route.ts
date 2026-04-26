import { handleRoute } from '@/lib/api/response'
import { requireLojista } from '@/server/auth/session'
import { getDashboardMetrics } from '@/server/pecas/dashboard'

export const dynamic = 'force-dynamic'

export async function GET() {
  return handleRoute(async () => {
    const session = await requireLojista()
    return await getDashboardMetrics(session.loja.id, session.loja.cota_try_on_mensal)
  })
}
