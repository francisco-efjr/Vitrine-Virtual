import { handleRoute } from '@/lib/api/response'
import { requireSuperAdmin } from '@/server/auth/session'
import { calibrateDHashThreshold, computeQualityReport } from '@/server/try-on/calibrate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/super-admin/try-on/quality
 *
 * Relatório de qualidade da Cabine: approval rates por provider/model,
 * razões de rejeição, eficácia do gate e sugestões de calibração de threshold.
 *
 * Query params:
 *   days=30   (default 30, max 90)
 */
export async function GET(req: Request) {
  return handleRoute(async () => {
    await requireSuperAdmin()

    const url = new URL(req.url)
    const daysRaw = parseInt(url.searchParams.get('days') ?? '30', 10)
    const days = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw, 1), 90) : 30

    const [report, dhashSuggestion] = await Promise.all([
      computeQualityReport(days),
      calibrateDHashThreshold(),
    ])

    if (dhashSuggestion) {
      report.threshold_suggestions.push(dhashSuggestion)
    }

    return report
  })
}
