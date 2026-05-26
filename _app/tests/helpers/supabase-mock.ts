import { vi } from 'vitest'

/**
 * Helper para mockar `createServiceClient` do Supabase em testes unitários.
 *
 * Uso:
 *   import { mockServiceClient } from '@/../tests/helpers/supabase-mock'
 *
 *   vi.mock('@/lib/supabase/service', () => ({
 *     createServiceClient: () => mockServiceClient({
 *       from: { system_settings: { select: ..., maybeSingle: { data: ..., error: null } } }
 *     })
 *   }))
 *
 * É um stub bem simples — cobre os casos do MVP: from(table).select().eq().maybeSingle(),
 * insert/update/upsert(), e rpc().
 */

type Result<T> = { data: T | null; error: { message: string } | null }

export interface SupabaseMockSpec {
  /** Responses para .from(table).select().*. */
  tables?: Record<
    string,
    {
      select?: Result<unknown> | Result<unknown[]>
      maybeSingle?: Result<unknown>
      single?: Result<unknown>
      insert?: Result<unknown>
      update?: Result<unknown>
      upsert?: Result<unknown>
      delete?: Result<unknown>
    }
  >
  /** Responses para .rpc('functionName', args). */
  rpc?: Record<string, Result<unknown>>
}

export function mockServiceClient(spec: SupabaseMockSpec = {}) {
  function chain(table: string) {
    const t = spec.tables?.[table] ?? {}
    const builder: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(t.maybeSingle ?? { data: null, error: null }),
      single: vi.fn().mockResolvedValue(t.single ?? { data: null, error: null }),
      then: undefined as unknown,
    }
    // Quando o caller faz `await query` (sem chamar single/maybeSingle),
    // resolve para a resposta de .select.
    Object.defineProperty(builder, 'then', {
      value: function (resolve: (v: unknown) => void) {
        resolve(t.select ?? { data: [], error: null })
      },
    })
    builder.insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(t.insert ?? { data: null, error: null }),
      then: (resolve: (v: unknown) => void) =>
        resolve(t.insert ?? { data: null, error: null }),
    })
    builder.update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(t.update ?? { data: null, error: null }),
        then: (resolve: (v: unknown) => void) =>
          resolve(t.update ?? { data: null, error: null }),
      }),
      then: (resolve: (v: unknown) => void) =>
        resolve(t.update ?? { data: null, error: null }),
    })
    builder.upsert = vi.fn().mockResolvedValue(t.upsert ?? { data: null, error: null })
    builder.delete = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(t.delete ?? { data: null, error: null }),
    })
    return builder
  }

  return {
    from: vi.fn((table: string) => chain(table)),
    rpc: vi.fn(async (fn: string, _args?: unknown) => {
      return spec.rpc?.[fn] ?? { data: null, error: null }
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      admin: {
        listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
        inviteUserByEmail: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    storage: {
      from: vi.fn(() => ({
        createSignedUploadUrl: vi.fn().mockResolvedValue({ data: null, error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: null, error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    },
  }
}
