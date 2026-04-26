import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks must be before module-under-test imports

vi.mock('@/lib/drizzle/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(),
}))

import { db } from '@/lib/drizzle/client'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { registerUser } from '@/actions/auth'

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function buildDbSelectChain(count: number) {
  const fromFn = vi.fn().mockResolvedValue([{ count }])
  const selectFn = vi.fn().mockReturnValue({ from: fromFn })
  return { selectFn, fromFn }
}

function buildDbInsertChain() {
  const valuesFn = vi.fn().mockResolvedValue(undefined)
  const insertFn = vi.fn().mockReturnValue({ values: valuesFn })
  return { insertFn, valuesFn }
}

const DEFAULT_CATEGORY_NAMES = [
  'Gimnasio / Ejercicio',
  'Estudio',
  'Trabajo',
  'Búsqueda de empleo',
  'Social / Familia',
  'Descanso / Sueño',
  'Proyectos personales',
  'Deportes / Recreación',
]

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe('seedDefaultCategories — called after successful registration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('inserts exactly 8 default categories for the new user', async () => {
    const { selectFn } = buildDbSelectChain(2)
    vi.mocked(db).select = selectFn as unknown as typeof db.select

    const { insertFn, valuesFn } = buildDbInsertChain()
    vi.mocked(db).insert = insertFn as unknown as typeof db.insert

    const adminMock = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { user: { id: 'new-user-uuid', email: 'fresh@example.com' }, session: null },
          error: null,
        }),
      },
    }
    vi.mocked(createSupabaseClient).mockReturnValue(adminMock as ReturnType<typeof createSupabaseClient>)

    await registerUser('fresh@example.com', 'password123')

    // insert must have been called once (bulk insert with all 8)
    expect(insertFn).toHaveBeenCalledTimes(1)

    // The values passed to .values() should be an array of 8 objects
    const insertedValues = valuesFn.mock.calls[0][0] as Array<{
      userId: string
      name: string
      color: string
      icon: string
    }>

    expect(insertedValues).toHaveLength(8)
    expect(insertedValues.every((c) => c.userId === 'new-user-uuid')).toBe(true)

    const insertedNames = insertedValues.map((c) => c.name)
    for (const name of DEFAULT_CATEGORY_NAMES) {
      expect(insertedNames).toContain(name)
    }
  })

  it('does NOT seed categories when registration fails (at cap)', async () => {
    const { selectFn } = buildDbSelectChain(5)
    vi.mocked(db).select = selectFn as unknown as typeof db.select

    const { insertFn } = buildDbInsertChain()
    vi.mocked(db).insert = insertFn as unknown as typeof db.insert

    await registerUser('blocked@example.com', 'password123')

    expect(insertFn).not.toHaveBeenCalled()
  })

  it('does NOT seed categories when Supabase signUp returns an error', async () => {
    const { selectFn } = buildDbSelectChain(1)
    vi.mocked(db).select = selectFn as unknown as typeof db.select

    const { insertFn } = buildDbInsertChain()
    vi.mocked(db).insert = insertFn as unknown as typeof db.insert

    const adminMock = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Email already registered' },
        }),
      },
    }
    vi.mocked(createSupabaseClient).mockReturnValue(adminMock as ReturnType<typeof createSupabaseClient>)

    await registerUser('dup@example.com', 'password123')

    expect(insertFn).not.toHaveBeenCalled()
  })
})
