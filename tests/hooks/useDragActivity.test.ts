import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createStore } from 'jotai'
import { useDragActivity } from '@/hooks/useDragActivity'
import type { Activity } from '@/atoms/calendar'
import { dayActivitiesAtom } from '@/atoms/calendar'
import { DAY_START_MIN, minutesToPx } from '@/lib/time'
import type React from 'react'

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1',
    userId: 'user-1',
    day: '2024-01-15',
    title: 'Morning Run',
    startMin: 480,
    durationMin: 60,
    categoryId: 'cat-health',
    status: 'planned',
    createdAt: '2024-01-15T08:00:00Z',
    ...overrides,
  }
}

// Mock setPointerCapture / releasePointerCapture — not in jsdom
function mockPointerCapture(element: HTMLElement) {
  element.setPointerCapture = vi.fn()
  element.releasePointerCapture = vi.fn()
  return element
}

// ----------------------------------------------------------------
// Mock moveActivity to avoid DB calls
// ----------------------------------------------------------------

vi.mock('@/actions/activities', () => ({
  moveActivity: vi.fn().mockResolvedValue(undefined),
}))

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe('useDragActivity — pure math and pointer lifecycle', () => {
  // Use a mutable ref object (plain object, not createRef which is read-only)
  let columnRef: { current: HTMLDivElement | null }
  let store: ReturnType<typeof createStore>
  let activity: Activity
  const COLUMN_TOP = 100
  const COLUMN_LEFT = 60
  const COLUMN_WIDTH = 200

  beforeEach(() => {
    // Fresh store + fresh atomFamily state
    dayActivitiesAtom.remove('2024-01-15')
    store = createStore()
    activity = makeActivity()
    store.set(dayActivitiesAtom(activity.day), [activity])

    // Create a real DOM element for the column ref
    const div = document.createElement('div')
    div.getBoundingClientRect = vi.fn().mockReturnValue({
      top: COLUMN_TOP,
      left: COLUMN_LEFT,
      width: COLUMN_WIDTH,
      height: minutesToPx(1440 - DAY_START_MIN),
      right: COLUMN_LEFT + COLUMN_WIDTH,
      bottom: COLUMN_TOP + minutesToPx(1440 - DAY_START_MIN),
    })
    columnRef = { current: div }
  })

  afterEach(() => {
    dayActivitiesAtom.remove('2024-01-15')
    vi.clearAllMocks()
  })

  it('returns handlePointerDown and isDragging=false initially', () => {
    const { result } = renderHook(() =>
      useDragActivity({ activity, columnRef, store })
    )
    expect(result.current.isDragging).toBe(false)
    expect(typeof result.current.handlePointerDown).toBe('function')
  })

  it('sets isDragging to true on pointerdown', () => {
    const { result } = renderHook(() =>
      useDragActivity({ activity, columnRef, store })
    )

    const element = document.createElement('div')
    mockPointerCapture(element)

    act(() => {
      result.current.handlePointerDown(
        { pointerId: 1, clientX: COLUMN_LEFT + 10, clientY: COLUMN_TOP + 30 } as React.PointerEvent<HTMLDivElement>,
        element
      )
    })

    expect(result.current.isDragging).toBe(true)
  })

  it('calls setPointerCapture on the element when dragging starts', () => {
    const { result } = renderHook(() =>
      useDragActivity({ activity, columnRef, store })
    )

    const element = document.createElement('div')
    mockPointerCapture(element)

    act(() => {
      result.current.handlePointerDown(
        { pointerId: 42, clientX: COLUMN_LEFT + 10, clientY: COLUMN_TOP + 30 } as React.PointerEvent<HTMLDivElement>,
        element
      )
    })

    expect(element.setPointerCapture).toHaveBeenCalledWith(42)
  })

  it('snap math: clientY → correct snapped startMin', async () => {
    // Test the pure math independently using already-imported helpers
    const { pxToMinutes, snap } = await import('@/lib/time')
    const clientY = COLUMN_TOP + minutesToPx(60) // offset 60px from column top
    const offsetPx = clientY - COLUMN_TOP
    const rawMin = pxToMinutes(offsetPx) + DAY_START_MIN
    const snapped = snap(rawMin)
    // minutesToPx(60) = 90px; pxToMinutes(90) = 60 min; 60 + 360 = 420; snap(420) = 420
    expect(snapped).toBe(420)
  })

  it('calls moveActivity and resets isDragging on pointerup', async () => {
    const { moveActivity } = await import('@/actions/activities')
    const { result } = renderHook(() =>
      useDragActivity({ activity, columnRef, store })
    )

    const element = document.createElement('div')
    mockPointerCapture(element)

    // Start drag
    act(() => {
      result.current.handlePointerDown(
        { pointerId: 1, clientX: COLUMN_LEFT + 10, clientY: COLUMN_TOP + 30 } as React.PointerEvent<HTMLDivElement>,
        element
      )
    })

    // End drag
    await act(async () => {
      result.current.handlePointerUp(
        { pointerId: 1, clientX: COLUMN_LEFT + 10, clientY: COLUMN_TOP + 30 } as React.PointerEvent<HTMLDivElement>,
        element
      )
    })

    expect(element.releasePointerCapture).toHaveBeenCalledWith(1)
    expect(moveActivity).toHaveBeenCalled()
    expect(result.current.isDragging).toBe(false)
  })
})
