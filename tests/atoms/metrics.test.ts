import { describe, it, expect, beforeEach } from 'vitest'
import { createStore } from 'jotai'
import { dayActivitiesAtom, addActivityAtom } from '@/atoms/calendar'
import type { Activity } from '@/atoms/calendar'
import { weekMetricsAtom } from '@/atoms/metrics'

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

const WEEK_DAYS = [
  '2024-01-15', // Mon
  '2024-01-16', // Tue
  '2024-01-17', // Wed
  '2024-01-18', // Thu
  '2024-01-19', // Fri
  '2024-01-20', // Sat
  '2024-01-21', // Sun
]

let idCounter = 0
function makeActivity(overrides: Partial<Activity>): Activity {
  idCounter++
  return {
    id: `act-${idCounter}`,
    userId: 'user-1',
    day: '2024-01-15',
    title: `Activity ${idCounter}`,
    startMin: 360,
    durationMin: 60,
    categoryId: 'cat-work',
    status: 'planned',
    createdAt: '2024-01-15T00:00:00Z',
    ...overrides,
  }
}

// ----------------------------------------------------------------
// Setup / teardown
// ----------------------------------------------------------------

function cleanWeek() {
  WEEK_DAYS.forEach((d) => dayActivitiesAtom.remove(d))
}

function makeStore() {
  return createStore()
}

// ----------------------------------------------------------------
// hoursByCategory
// ----------------------------------------------------------------

describe('weekMetricsAtom — hoursByCategory', () => {
  beforeEach(() => {
    idCounter = 0
    cleanWeek()
  })

  it('returns an empty record when no activities exist', () => {
    const store = makeStore()
    const metrics = store.get(weekMetricsAtom(WEEK_DAYS))
    expect(metrics.hoursByCategory).toEqual({})
  })

  it('counts only completed activities', () => {
    const store = makeStore()
    store.set(addActivityAtom, makeActivity({ day: '2024-01-15', categoryId: 'cat-work', status: 'completed', durationMin: 120 }))
    store.set(addActivityAtom, makeActivity({ day: '2024-01-15', categoryId: 'cat-work', status: 'planned', durationMin: 60 }))
    store.set(addActivityAtom, makeActivity({ day: '2024-01-15', categoryId: 'cat-work', status: 'skipped', durationMin: 30 }))

    const metrics = store.get(weekMetricsAtom(WEEK_DAYS))
    // Only 120 min = 2 hours from the completed one
    expect(metrics.hoursByCategory['cat-work']).toBeCloseTo(2)
  })

  it('aggregates across multiple days and categories', () => {
    const store = makeStore()
    // cat-work: 60 min Monday + 90 min Tuesday = 150 min = 2.5h
    store.set(addActivityAtom, makeActivity({ day: '2024-01-15', categoryId: 'cat-work', status: 'completed', durationMin: 60 }))
    store.set(addActivityAtom, makeActivity({ day: '2024-01-16', categoryId: 'cat-work', status: 'completed', durationMin: 90 }))
    // cat-health: 45 min Wednesday = 0.75h
    store.set(addActivityAtom, makeActivity({ day: '2024-01-17', categoryId: 'cat-health', status: 'completed', durationMin: 45 }))

    const metrics = store.get(weekMetricsAtom(WEEK_DAYS))
    expect(metrics.hoursByCategory['cat-work']).toBeCloseTo(2.5)
    expect(metrics.hoursByCategory['cat-health']).toBeCloseTo(0.75)
  })
})

// ----------------------------------------------------------------
// dailyProgress
// ----------------------------------------------------------------

describe('weekMetricsAtom — dailyProgress', () => {
  beforeEach(() => {
    idCounter = 0
    cleanWeek()
  })

  it('returns zero completed and zero planned when day has no activities', () => {
    const store = makeStore()
    const metrics = store.get(weekMetricsAtom(WEEK_DAYS))
    expect(metrics.dailyProgress['2024-01-15']).toEqual({ completed: 0, planned: 0 })
  })

  it('sums ALL activities (any status) as planned minutes', () => {
    const store = makeStore()
    store.set(addActivityAtom, makeActivity({ day: '2024-01-15', status: 'completed', durationMin: 60 }))
    store.set(addActivityAtom, makeActivity({ day: '2024-01-15', status: 'planned', durationMin: 30 }))
    store.set(addActivityAtom, makeActivity({ day: '2024-01-15', status: 'skipped', durationMin: 15 }))

    const metrics = store.get(weekMetricsAtom(WEEK_DAYS))
    // All 3 contribute to planned total
    expect(metrics.dailyProgress['2024-01-15'].planned).toBe(105)
    // Only completed contributes to completed total
    expect(metrics.dailyProgress['2024-01-15'].completed).toBe(60)
  })

  it('tracks progress independently per day', () => {
    const store = makeStore()
    store.set(addActivityAtom, makeActivity({ day: '2024-01-15', status: 'completed', durationMin: 60 }))
    store.set(addActivityAtom, makeActivity({ day: '2024-01-16', status: 'planned', durationMin: 90 }))

    const metrics = store.get(weekMetricsAtom(WEEK_DAYS))
    expect(metrics.dailyProgress['2024-01-15']).toEqual({ completed: 60, planned: 60 })
    expect(metrics.dailyProgress['2024-01-16']).toEqual({ completed: 0, planned: 90 })
  })
})

// ----------------------------------------------------------------
// weeklyPct
// ----------------------------------------------------------------

describe('weekMetricsAtom — weeklyPct', () => {
  beforeEach(() => {
    idCounter = 0
    cleanWeek()
  })

  it('returns 0 when there are no planned activities', () => {
    const store = makeStore()
    const metrics = store.get(weekMetricsAtom(WEEK_DAYS))
    expect(metrics.weeklyPct).toBe(0)
  })

  it('computes weekly % as completed / planned across all 7 days', () => {
    const store = makeStore()
    // Total planned: 120 min, total completed: 60 min → 50%
    store.set(addActivityAtom, makeActivity({ day: '2024-01-15', status: 'completed', durationMin: 60 }))
    store.set(addActivityAtom, makeActivity({ day: '2024-01-16', status: 'planned', durationMin: 60 }))

    const metrics = store.get(weekMetricsAtom(WEEK_DAYS))
    expect(metrics.weeklyPct).toBeCloseTo(0.5)
  })

  it('returns 1 when all activities are completed', () => {
    const store = makeStore()
    store.set(addActivityAtom, makeActivity({ day: '2024-01-15', status: 'completed', durationMin: 60 }))
    store.set(addActivityAtom, makeActivity({ day: '2024-01-17', status: 'completed', durationMin: 90 }))

    const metrics = store.get(weekMetricsAtom(WEEK_DAYS))
    expect(metrics.weeklyPct).toBe(1)
  })

  it('does not count skipped activities as completed', () => {
    const store = makeStore()
    store.set(addActivityAtom, makeActivity({ day: '2024-01-15', status: 'completed', durationMin: 60 }))
    store.set(addActivityAtom, makeActivity({ day: '2024-01-15', status: 'skipped', durationMin: 60 }))

    const metrics = store.get(weekMetricsAtom(WEEK_DAYS))
    // 60 completed / 120 total planned
    expect(metrics.weeklyPct).toBeCloseTo(0.5)
  })
})

// ----------------------------------------------------------------
// reactivity — atom is derived (changes propagate)
// ----------------------------------------------------------------

describe('weekMetricsAtom — reactivity', () => {
  beforeEach(() => {
    idCounter = 0
    cleanWeek()
  })

  it('updates weeklyPct when an activity is added', () => {
    const store = makeStore()

    const before = store.get(weekMetricsAtom(WEEK_DAYS))
    expect(before.weeklyPct).toBe(0)

    store.set(addActivityAtom, makeActivity({ day: '2024-01-15', status: 'completed', durationMin: 60 }))

    const after = store.get(weekMetricsAtom(WEEK_DAYS))
    expect(after.weeklyPct).toBe(1)
  })
})
