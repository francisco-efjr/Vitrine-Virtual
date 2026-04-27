import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let currentMock: ReturnType<typeof import('../../../../tests/helpers/supabase-mock').mockServiceClient>

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => currentMock,
}))

import { mockServiceClient } from '../../../../tests/helpers/supabase-mock'
import { checkLojaQuota } from '../quota'

describe('checkLojaQuota', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('ok=true quando uso < limite', async () => {
    currentMock = mockServiceClient({ rpc: { try_on_uso_mes_atual: { data: 50, error: null } } })
    const r = await checkLojaQuota('loja-1', 200)
    expect(r).toEqual({ ok: true, used: 50, limit: 200, remaining: 150 })
  })

  it('ok=false quando uso == limite (estritamente menor)', async () => {
    currentMock = mockServiceClient({ rpc: { try_on_uso_mes_atual: { data: 200, error: null } } })
    const r = await checkLojaQuota('loja-1', 200)
    expect(r.ok).toBe(false)
    expect(r.remaining).toBe(0)
  })

  it('ok=false quando uso > limite', async () => {
    currentMock = mockServiceClient({ rpc: { try_on_uso_mes_atual: { data: 250, error: null } } })
    const r = await checkLojaQuota('loja-1', 200)
    expect(r.ok).toBe(false)
    expect(r.remaining).toBe(0)
  })

  it('used=0 quando RPC retorna null', async () => {
    currentMock = mockServiceClient({ rpc: { try_on_uso_mes_atual: { data: null, error: null } } })
    const r = await checkLojaQuota('loja-1', 200)
    expect(r.used).toBe(0)
    expect(r.ok).toBe(true)
  })

  it('lança erro quando RPC falha', async () => {
    currentMock = mockServiceClient({
      rpc: { try_on_uso_mes_atual: { data: null, error: { message: 'fail' } } },
    })
    await expect(checkLojaQuota('loja-1', 200)).rejects.toBeTruthy()
  })
})
