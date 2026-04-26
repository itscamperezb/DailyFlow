import { describe, it, expect, vi, beforeEach } from 'vitest'

// ----------------------------------------------------------------
// Hoisted mocks — vars must be created with vi.hoisted so they are
// available when the vi.mock factory runs (factories are hoisted to
// the top of the file by Vitest/Babel).
// ----------------------------------------------------------------

const { mockGetSession, mockRedirect } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockRedirect: vi.fn(),
}))

vi.mock('@/lib/supabase.server', () => ({
  createServerSupabaseClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getSession: mockGetSession,
      },
    })
  ),
}))

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))

// ----------------------------------------------------------------
// Import after mocks are in place
// ----------------------------------------------------------------

import { AuthGuard } from '@/components/AuthGuard'

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls redirect("/login") when Supabase returns no session', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } })

    // AuthGuard is an async server component — invoke it directly as a function
    await AuthGuard({ children: <div>protected</div> })

    expect(mockRedirect).toHaveBeenCalledOnce()
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('renders children without redirecting when a valid session exists', async () => {
    const fakeSession = { user: { id: 'user-1', email: 'test@example.com' }, access_token: 'tok' }
    mockGetSession.mockResolvedValueOnce({ data: { session: fakeSession } })

    const result = await AuthGuard({ children: <span data-testid="child">hello</span> })

    expect(mockRedirect).not.toHaveBeenCalled()
    // The component renders a fragment wrapping children — result should be truthy
    expect(result).toBeTruthy()
  })
})
