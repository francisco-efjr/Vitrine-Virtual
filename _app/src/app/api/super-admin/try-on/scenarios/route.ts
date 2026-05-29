import { handleRoute } from '@/lib/api/response'
import { requireSuperAdmin } from '@/server/auth/session'
import { computeScenariosReport } from '@/server/try-on/scenarios'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/super-admin/try-on/scenarios
 *
 * P2.18 — agregação por dia de cenários e flags pra dashboard de calibração.
 *
 * Query params:
 *   days=30  (default 30, max 90)
 */
export async function GET(req: Request) {
  return handleRoute(async () => {
    await requireSuperAdmin()
    const url = new URL(req.url)
    const daysRaw = parseInt(url.searchParams.get('days') ?? '30', 10)
    const days = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw, 1), 90) : 30
    return computeScenariosReport(days)
  })
}
