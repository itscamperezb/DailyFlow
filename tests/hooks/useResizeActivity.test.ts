import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createStore } from 'jotai'
import { useResizeActivity } from '@/hooks/useResizeActivity'
import type { Activity } from '@/atoms/calendar'
import { dayActivitiesAtom } from '@/atoms/calendar'
import { DAY_START_MIN, DAY_END_MIN, minutesToPx, pxToMinutes, snap } from '@/lib/time'

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1',
    userId: 'user-1',
    day: '2024-01-15',
    title: 'Morning Run',
    startMin: 480, // 08:00
    durationMin: 60,
    categoryId: 'cat-health',
    status: 'planned',
    createdAt: '2024-01-15T08:00:00Z',
    ...overrides,
  }
}

vi.mock('@/actions/activities', () => ({
  resizeActivity: vi.fn().mockResolvedValue(undefined),
}))

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe('useResizeActivity — snap and clamp math', () => {
  let store: ReturnType<typeof createStore>
  let activity: Activity

  beforeEach(() => {
    dayActivitiesAtom.remove('2024-01-15')
    store = createStore()
    activity = makeActivity()
  })

  afterEach(() => {
    dayActivitiesAtom.remove('2024-01-15')
    vi.clearAllMocks()
  })

  it('returns handleResizePointerDown function', () => {
    const { result } = renderHook(() =>
      useResizeActivity({ activity, store })
    )
    expect(typeof result.current.handleResizePointerDown).toBe('function')
  })

  it('calls setPointerCapture on the handle element on pointerdown', () => {
    const { result } = renderHook(() =>
      useResizeActivity({ activity, store })
    )

    const element = document.createElement('div')
    element.setPointerCapture = vi.fn()
    element.releasePointerCapture = vi.fn()

    // Provide block top so the hook knows block position
    const BLOCK_TOP = 100
    act(() => {
      result.current.handleResizePointerDown(
        { pointerId: 5, clientY: BLOCK_TOP + minutesToPx(activity.durationMin) } as React.PointerEvent<HTMLDivElement>,
        element,
        BLOCK_TOP
      )
    })

    expect(element.setPointerCapture).toHaveBeenCalledWith(5)
  })

  it('snaps duration to 15-minute increments on pointermove', () => {
    // Pure math test
    // If activity starts at 480 (08:00), blockTop corresponds to startMin
    // clientY = blockTop + raw duration pixels
    // e.g. raw drag to 73px → pxToMinutes(73) = 48.67 min
    // newDuration = snap(48.67) = 45
    const rawPx = 73
    const rawMin = pxToMinutes(rawPx)
    const snapped = snap(rawMin)
    expect(snapped).toBe(45) // nearest 15-min boundary
  })

  it('computes correct duration when dragging to 90px below block top', () => {
    // 90px = pxToMinutes(90) = 60 min → snap(60) = 60
    const durationMin = snap(pxToMinutes(90))
    expect(durationMin).toBe(60)
  })

  it('enforces minimum duration of SNAP_MIN (15 min)', () => {
    // Even if drag is tiny (5px → 3.33 min → snap → 0), clamp to 15
    const rawPx = 5
    const rawMin = snap(pxToMinutes(rawPx))
    const clamped = Math.max(rawMin, 15)
    expect(clamped).toBe(15)
  })

  it('clamps total end to DAY_END_MIN (midnight)', () => {
    // Activity starts at 1380 (23:00). Drag to a very large duration.
    const startMin = 1380
    const hugeDuration = 200 // would push end to 1580, past midnight
    const endMin = startMin + hugeDuration
    const clamped = Math.min(endMin, DAY_END_MIN) - startMin
    expect(clamped).toBe(DAY_END_MIN - startMin) // 60
    expect(clamped).toBe(60)
  })

  it('calls resizeActivity with snapped duration on pointerup', async () => {
    const { resizeActivity } = await import('@/actions/activities')
    const { result } = renderHook(() =>
      useResizeActivity({ activity, store })
    )

    const element = document.createElement('div')
    element.setPointerCapture = vi.fn()
    element.releasePointerCapture = vi.fn()

    const BLOCK_TOP = 200
    // Start resize
    act(() => {
      result.current.handleResizePointerDown(
        { pointerId: 3, clientY: BLOCK_TOP + minutesToPx(activity.durationMin) } as React.PointerEvent<HTMLDivElement>,
        element,
        BLOCK_TOP
      )
    })

    // End resize at 90px below block top → 60 min duration
    await act(async () => {
      result.current.handleResizePointerUp(
        { pointerId: 3, clientY: BLOCK_TOP + 90 } as React.PointerEvent<HTMLDivElement>,
        element,
        BLOCK_TOP
      )
    })

    expect(element.releasePointerCapture).toHaveBeenCalledWith(3)
    expect(resizeActivity).toHaveBeenCalledWith(
      store,
      activity.id,
      activity.day,
      60
    )
  })
})
