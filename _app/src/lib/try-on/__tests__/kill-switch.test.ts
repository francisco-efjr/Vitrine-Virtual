import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock do service client antes do import do módulo testado
let currentMock: ReturnType<typeof import('../../../../tests/helpers/supabase-mock').mockServiceClient>

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => currentMock,
}))

import { mockServiceClient } from '../../../../tests/helpers/supabase-mock'
import { getTryOnBudget, isTryOnEnabled, setTryOnEnabled } from '../kill-switch'

describe('isTryOnEnabled', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('retorna true quando system_settings.try_on_enabled = true', async () => {
    currentMock = mockServiceClient({
      tables: { system_settings: { maybeSingle: { data: { value: true }, error: null } } },
    })
    expect(await isTryOnEnabled()).toBe(true)
  })

  it('retorna false quando value = false', async () => {
    currentMock = mockServiceClient({
      tables: { system_settings: { maybeSingle: { data: { value: false }, error: null } } },
    })
    expect(await isTryOnEnabled()).toBe(false)
  })

  it('retorna false (fail-closed) quando há erro lendo o banco', async () => {
    currentMock = mockServiceClient({
      tables: {
        system_settings: { maybeSingle: { data: null, error: { message: 'down' } } },
      },
    })
    expect(await isTryOnEnabled()).toBe(false)
  })

  it('retorna false quando setting não existe', async () => {
    currentMock = mockServiceClient({
      tables: { system_settings: { maybeSingle: { data: null, error: null } } },
    })
    expect(await isTryOnEnabled()).toBe(false)
  })
})

describe('setTryOnEnabled', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('chama upsert com a nova flag e usuário', async () => {
    currentMock = mockServiceClient({
      tables: { system_settings: { upsert: { data: null, error: null } } },
    })
    await setTryOnEnabled(false, 'user-123')
    expect(currentMock.from).toHaveBeenCalledWith('system_settings')
  })

  it('lança erro se upsert falhar', async () => {
    currentMock = mockServiceClient({
      tables: { system_settings: { upsert: { data: null, error: { message: 'denied' } } } },
    })
    await expect(setTryOnEnabled(true)).rejects.toBeTruthy()
  })
})

describe('getTryOnBudget', () => {
  it('retorna defaults quando nada está no banco', async () => {
    currentMock = mockServiceClient({
      tables: { system_settings: { select: { data: [], error: null } } },
    })
    const r = await getTryOnBudget()
    expect(r.budgetUsd).toBe(100)
    expect(r.costPerGen).toBe(0.06)
  })

  it('retorna valores do banco quando presentes', async () => {
    currentMock = mockServiceClient({
      tables: {
        system_settings: {
          select: {
            data: [
              { key: 'try_on_monthly_budget_usd', value: 250 },
              { key: 'try_on_cost_per_generation_usd', value: 0.12 },
            ],
            error: null,
          },
        },
      },
    })
    const r = await getTryOnBudget()
    expect(r.budgetUsd).toBe(250)
    expect(r.costPerGen).toBe(0.12)
  })
})
