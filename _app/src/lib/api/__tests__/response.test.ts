import { describe, expect, it } from 'vitest'
import { ZodError, z } from 'zod'
import { fail, handleRoute, ok } from '../response'
import { AuthError } from '@/server/auth/session'
import { LojaError } from '@/server/lojas/errors'
import { PecaError } from '@/server/pecas/errors'

describe('ok()', () => {
  it('retorna 200 com { ok: true, data }', async () => {
    const res = ok({ foo: 'bar' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true, data: { foo: 'bar' } })
  })

  it('respeita init customizado (status, headers)', async () => {
    const res = ok({ a: 1 }, { status: 201 })
    expect(res.status).toBe(201)
  })
})

describe('fail()', () => {
  it('retorna { ok: false, error: { message, code } } com status', async () => {
    const res = fail('Boom', 'BOOM', 500)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ ok: false, error: { message: 'Boom', code: 'BOOM' } })
  })

  it('default status = 400', async () => {
    expect(fail('x', 'X').status).toBe(400)
  })
})

describe('handleRoute()', () => {
  it('embrulha resultado em ok() quando handler retorna valor', async () => {
    const res = await handleRoute(async () => ({ hello: 'world' }))
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.data).toEqual({ hello: 'world' })
  })

  it('passa NextResponse direto se o handler já retorna um', async () => {
    const direct = ok({ direct: true })
    const res = await handleRoute(async () => direct)
    expect(res).toBe(direct)
  })

  it('mapeia ZodError para 400', async () => {
    const res = await handleRoute(async () => {
      z.object({ whatsapp_e164: z.string().regex(/^\+/, 'Inclua o + no WhatsApp') }).parse({
        whatsapp_e164: '5511999999999',
      })
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.message).toContain('whatsapp e164')
  })

  it('mapeia AuthError para o status do erro', async () => {
    const res = await handleRoute(async () => {
      throw new AuthError('Não autenticado', 401)
    })
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe('AUTH_ERROR')
  })

  it('mapeia LojaError com code customizado', async () => {
    const res = await handleRoute(async () => {
      throw new LojaError('Slug em uso', 'SLUG_INDISPONIVEL', 409)
    })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('SLUG_INDISPONIVEL')
  })

  it('mapeia PecaError', async () => {
    const res = await handleRoute(async () => {
      throw new PecaError('Não achou', 'NOT_FOUND', 404)
    })
    expect(res.status).toBe(404)
  })

  it('erros não-tratados viram 500 INTERNAL_ERROR sem vazar detalhes', async () => {
    const res = await handleRoute(async () => {
      throw new Error('detalhe-secreto-do-stacktrace-que-nao-pode-vazar')
    })
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error.message).toBe('Erro interno')
    expect(body.error.code).toBe('INTERNAL_ERROR')
    expect(JSON.stringify(body)).not.toContain('detalhe-secreto')
  })
})
