import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks declared BEFORE imports of the module under test ---

// Mock the drizzle client so we can control the user count query
vi.mock('@/lib/drizzle/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}))

// Mock @supabase/supabase-js for the admin/service-role client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

// Mock the @supabase/ssr browser client factory
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(),
}))

// Import mocks AFTER vi.mock calls
import { db } from '@/lib/drizzle/client'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { registerUser, loginUser } from '@/actions/auth'

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function buildDbSelectChain(count: number) {
  // Simulates: db.select({ count: sql`count(*)` }).from(users) → [{ count }]
  const fromFn = vi.fn().mockResolvedValue([{ count }])
  const selectFn = vi.fn().mockReturnValue({ from: fromFn })
  return { selectFn, fromFn }
}

function buildSupabaseAdminMock({
  signUpData = { user: { id: 'user-123', email: 'test@example.com' }, session: null },
  signUpError = null,
}: {
  signUpData?: { user: { id: string; email: string } | null; session: null } | null
  signUpError?: { message: string } | null
} = {}) {
  return {
    auth: {
      signUp: vi.fn().mockResolvedValue({ data: signUpData, error: signUpError }),
    },
  }
}

function buildSupabaseLoginMock({
  signInData = { user: { id: 'user-123' }, session: { access_token: 'tok' } },
  signInError = null,
}: {
  signInData?: object | null
  signInError?: { message: string } | null
} = {}) {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: signInData, error: signInError }),
    },
  }
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe('registerUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Silence console in tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('succeeds when user count is below the cap (< 5)', async () => {
    const { selectFn } = buildDbSelectChain(3)
    vi.mocked(db).select = selectFn as unknown as typeof db.select
    const valuesFn = vi.fn().mockResolvedValue(undefined)
    vi.mocked(db).insert = vi.fn().mockReturnValue({ values: valuesFn }) as unknown as typeof db.insert

    const adminMock = buildSupabaseAdminMock()
    vi.mocked(createSupabaseClient).mockReturnValue(adminMock as ReturnType<typeof createSupabaseClient>)

    const result = await registerUser('new@example.com', 'password123')

    expect(result.error).toBeNull()
    expect(result.data?.user?.email).toBe('test@example.com')
  })

  it('succeeds when user count is exactly 4 (last allowed slot)', async () => {
    const { selectFn } = buildDbSelectChain(4)
    vi.mocked(db).select = selectFn as unknown as typeof db.select
    const valuesFn = vi.fn().mockResolvedValue(undefined)
    vi.mocked(db).insert = vi.fn().mockReturnValue({ values: valuesFn }) as unknown as typeof db.insert

    const adminMock = buildSupabaseAdminMock()
    vi.mocked(createSupabaseClient).mockReturnValue(adminMock as ReturnType<typeof createSupabaseClient>)

    const result = await registerUser('last@example.com', 'password123')

    expect(result.error).toBeNull()
  })

  it('returns beta-closed error when user count is at the cap (>= 5)', async () => {
    const { selectFn } = buildDbSelectChain(5)
    vi.mocked(db).select = selectFn as unknown as typeof db.select

    const result = await registerUser('blocked@example.com', 'password123')

    expect(result.data).toBeNull()
    expect(result.error).toBe(
      'La app está en beta cerrada, no hay más cupos disponibles'
    )
  })

  it('returns beta-closed error when user count exceeds cap (> 5)', async () => {
    const { selectFn } = buildDbSelectChain(10)
    vi.mocked(db).select = selectFn as unknown as typeof db.select

    const result = await registerUser('over@example.com', 'password123')

    expect(result.data).toBeNull()
    expect(result.error).toBe(
      'La app está en beta cerrada, no hay más cupos disponibles'
    )
  })

  it('propagates Supabase signUp error', async () => {
    const { selectFn } = buildDbSelectChain(2)
    vi.mocked(db).select = selectFn as unknown as typeof db.select

    const adminMock = buildSupabaseAdminMock({
      signUpData: null,
      signUpError: { message: 'Email already registered' },
    })
    vi.mocked(createSupabaseClient).mockReturnValue(adminMock as ReturnType<typeof createSupabaseClient>)

    const result = await registerUser('dup@example.com', 'password123')

    expect(result.data).toBeNull()
    expect(result.error).toBe('Email already registered')
  })
})

describe('loginUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('returns session data on successful login', async () => {
    const loginMock = buildSupabaseLoginMock()
    // loginUser uses the browser/ssr client from @/lib/supabase
    const { createClient: createBrowserClient } = await import('@/lib/supabase')
    vi.mocked(createBrowserClient).mockReturnValue(loginMock as ReturnType<typeof createBrowserClient>)

    const result = await loginUser('user@example.com', 'correctpassword')

    expect(result.error).toBeNull()
    expect(result.data).toBeTruthy()
  })

  it('returns error on wrong credentials', async () => {
    const loginMock = buildSupabaseLoginMock({
      signInData: null,
      signInError: { message: 'Invalid login credentials' },
    })
    const { createClient: createBrowserClient } = await import('@/lib/supabase')
    vi.mocked(createBrowserClient).mockReturnValue(loginMock as ReturnType<typeof createBrowserClient>)

    const result = await loginUser('user@example.com', 'wrongpassword')

    expect(result.data).toBeNull()
    expect(result.error).toBe('Invalid login credentials')
  })
})
