import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createStore } from 'jotai'
import { DayColumn } from '@/components/calendar/DayColumn'
import { dayActivitiesAtom } from '@/atoms/calendar'
import type { Activity } from '@/atoms/calendar'
import { DAY_START_MIN, minutesToPx } from '@/lib/time'
import { Provider } from 'jotai'

// ----------------------------------------------------------------
// Mock ActivityBlock to isolate DayColumn logic
// ----------------------------------------------------------------

vi.mock('@/components/calendar/ActivityBlock', () => ({
  ActivityBlock: ({ activity }: { activity: Activity }) => (
    <div data-testid={`activity-${activity.id}`} data-start-min={activity.startMin}>
      {activity.title}
    </div>
  ),
}))

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

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe('DayColumn', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    dayActivitiesAtom.remove('2024-01-15')
    dayActivitiesAtom.remove('2024-01-16')
    store = createStore()
  })

  it('renders no activity blocks for an empty day', () => {
    const { container } = render(
      <Provider store={store}>
        <DayColumn day="2024-01-15" store={store} />
      </Provider>
    )
    const blocks = container.querySelectorAll('[data-testid^="activity-"]')
    expect(blocks.length).toBe(0)
  })

  it('renders one activity block when day has one activity', () => {
    store.set(dayActivitiesAtom('2024-01-15'), [makeActivity()])

    const { container } = render(
      <Provider store={store}>
        <DayColumn day="2024-01-15" store={store} />
      </Provider>
    )
    const blocks = container.querySelectorAll('[data-testid^="activity-"]')
    expect(blocks.length).toBe(1)
  })

  it('positions activity at correct top offset in px', () => {
    const activity = makeActivity({ startMin: 480 }) // 08:00 → 120px from top (480-360=120 min * 1.5)
    store.set(dayActivitiesAtom('2024-01-15'), [activity])

    const { container } = render(
      <Provider store={store}>
        <DayColumn day="2024-01-15" store={store} />
      </Provider>
    )

    // Find the wrapper div around the activity block (the positioned container)
    const activityBlock = container.querySelector('[data-testid="activity-act-1"]')
    const wrapper = activityBlock?.parentElement as HTMLElement
    const expectedTop = minutesToPx(activity.startMin - DAY_START_MIN)
    expect(expectedTop).toBe(180) // (480-360)*1.5 = 180px
    expect(wrapper?.style.top).toBe(`${expectedTop}px`)
  })

  it('renders multiple activities in the same day', () => {
    const activities = [
      makeActivity({ id: 'a1', startMin: 480 }),
      makeActivity({ id: 'a2', startMin: 600 }),
      makeActivity({ id: 'a3', startMin: 720 }),
    ]
    store.set(dayActivitiesAtom('2024-01-15'), activities)

    const { container } = render(
      <Provider store={store}>
        <DayColumn day="2024-01-15" store={store} />
      </Provider>
    )
    const blocks = container.querySelectorAll('[data-testid^="activity-"]')
    expect(blocks.length).toBe(3)
  })

  it('assigns correct width fraction for overlapping activities', () => {
    // Two overlapping activities → each gets width 50%
    const activities = [
      makeActivity({ id: 'a1', startMin: 480, durationMin: 120 }),
      makeActivity({ id: 'a2', startMin: 510, durationMin: 60 }),
    ]
    store.set(dayActivitiesAtom('2024-01-15'), activities)

    const { container } = render(
      <Provider store={store}>
        <DayColumn day="2024-01-15" store={store} />
      </Provider>
    )

    // Each activity wrapper should have width ~50%
    const wrappers = container.querySelectorAll('[data-activity-wrapper]') as NodeListOf<HTMLElement>
    expect(wrappers.length).toBe(2)
    // Both should reflect 2-column layout (50% width each)
    const widths = Array.from(wrappers).map((w) => w.style.width)
    expect(widths.every((w) => w === '50%')).toBe(true)
  })

  it('does not render activities from a different day', () => {
    store.set(dayActivitiesAtom('2024-01-16'), [makeActivity({ day: '2024-01-16', id: 'other-day' })])

    const { container } = render(
      <Provider store={store}>
        <DayColumn day="2024-01-15" store={store} />
      </Provider>
    )
    const blocks = container.querySelectorAll('[data-testid^="activity-"]')
    expect(blocks.length).toBe(0)
  })
})
