import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { logger } from '@/lib/logger'
import { AuthError } from '@/server/auth/session'
import { LojaError } from '@/server/lojas/errors'
import { PecaError } from '@/server/pecas/errors'

/** Resposta padrão para sucesso. */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true as const, data }, init)
}

/** Resposta padrão para erro. */
export function fail(message: string, code: string, status = 400) {
  return NextResponse.json({ ok: false as const, error: { message, code } }, { status })
}

/** Wrapper que mapeia exceptions para resposta HTTP apropriada. */
export async function handleRoute<T>(fn: () => Promise<NextResponse | T>): Promise<NextResponse> {
  try {
    const result = await fn()
    if (result instanceof NextResponse) return result
    return ok(result)
  } catch (err) {
    if (err instanceof ZodError) {
      return fail('Dados inválidos', 'VALIDATION_ERROR', 400)
    }
    if (err instanceof AuthError) {
      return fail(err.message, 'AUTH_ERROR', err.status)
    }
    if (err instanceof LojaError || err instanceof PecaError) {
      return fail(err.message, err.code, err.status)
    }
    logger.error('Erro não tratado em rota', {
      message: err instanceof Error ? err.message : String(err),
    })
    return fail('Erro interno', 'INTERNAL_ERROR', 500)
  }
}
