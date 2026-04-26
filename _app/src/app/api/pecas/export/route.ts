import { handleRoute } from '@/lib/api/response'
import { requireLojista } from '@/server/auth/session'
import { exportPecasCsv } from '@/server/pecas/export-csv'

export const dynamic = 'force-dynamic'

export async function GET() {
  return handleRoute(async () => {
    const session = await requireLojista()
    const csv = await exportPecasCsv(session.loja.id)
    const filename = `pecas-${session.loja.slug}-${new Date().toISOString().slice(0, 10)}.csv`
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  })
}
