import { NextResponse } from 'next/server'
import { ZodError, type ZodIssue } from 'zod'
import { logger } from '@/lib/logger'
import { AuthError } from '@/server/auth/session'
import { LojaError } from '@/server/lojas/errors'
import { PecaError } from '@/server/pecas/errors'

/** Resposta padrão para sucesso. */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true as const, data }, init)
}

/** Resposta padrão para erro. */
export function fail(
  message: string,
  code: string,
  status = 400,
  headers?: Record<string, string>,
) {
  return NextResponse.json(
    { ok: false as const, error: { message, code } },
    { status, headers },
  )
}

/** Wrapper que mapeia exceptions para resposta HTTP apropriada. */
export async function handleRoute<T>(fn: () => Promise<NextResponse | T>): Promise<NextResponse> {
  try {
    const result = await fn()
    if (result instanceof NextResponse) return result
    return ok(result)
  } catch (err) {
    if (err instanceof ZodError) {
      return fail(formatZodErrorMessage(err.issues), 'VALIDATION_ERROR', 400)
    }
    if (err instanceof AuthError) {
      return fail(err.message, 'AUTH_ERROR', err.status)
    }
    if (err instanceof LojaError || err instanceof PecaError) {
      return fail(err.message, err.code, err.status)
    }
    // Erro out-of-contract: ajuda debug levando o NOME da classe da exception
    // pra resposta (sem stack, sem PII) em vez de só "INTERNAL_ERROR" plano.
    // Antes o frontend só via "Erro interno" e o suporte tinha que abrir
    // Vercel Logs pra cada caso. Agora a primeira pista vem no response.
    const errName = err instanceof Error ? err.name : 'UnknownError'
    const errMessage = err instanceof Error ? err.message : String(err)
    // Postgres errors do Supabase costumam vir com shape { code, details, hint, message }
    // que NÃO é Error subclass. Olhamos por campos esperados pra dar contexto.
    let pgCode: string | undefined
    if (err && typeof err === 'object' && 'code' in err && typeof err.code === 'string') {
      pgCode = err.code
    }
    logger.error('Erro não tratado em rota', {
      name: errName,
      message: errMessage,
      pg_code: pgCode,
    })
    return fail(
      'Erro interno',
      pgCode ? `INTERNAL_ERROR_PG_${pgCode}` : `INTERNAL_ERROR_${errName}`,
      500,
    )
  }
}

function formatZodErrorMessage(issues: ZodIssue[]): string {
  const messages = issues
    .map((issue) => {
      const field = issue.path.at(0)
      if (typeof field === 'string' && issue.message) {
        const label = field.replace(/_/g, ' ')
        return `${label}: ${issue.message}`
      }
      return issue.message
    })
    .filter(Boolean)

  return messages[0] ?? 'Dados inválidos'
}
