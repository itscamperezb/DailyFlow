import { describe, it, expect, beforeEach } from 'vitest'
import { createStore } from 'jotai'
import {
  dayActivitiesAtom,
  addActivityAtom,
  updateActivityAtom,
  removeActivityAtom,
} from '@/atoms/calendar'
import type { Activity } from '@/atoms/calendar'

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1',
    userId: 'user-1',
    day: '2024-01-15',
    title: 'Morning run',
    startMin: 360, // 06:00
    durationMin: 60,
    categoryId: 'cat-health',
    status: 'planned',
    createdAt: '2024-01-15T06:00:00Z',
    ...overrides,
  }
}

// ----------------------------------------------------------------
// dayActivitiesAtom — initialization
// ----------------------------------------------------------------

describe('dayActivitiesAtom', () => {
  it('initializes to an empty array for any day key', () => {
    const store = createStore()
    expect(store.get(dayActivitiesAtom('2024-01-15'))).toEqual([])
    expect(store.get(dayActivitiesAtom('2024-01-16'))).toEqual([])
  })

  it('different day keys are independent atoms', () => {
    const store = createStore()
    const day1 = '2024-01-15'
    const day2 = '2024-01-16'

    store.set(addActivityAtom, makeActivity({ day: day1, id: 'a1' }))
    store.set(addActivityAtom, makeActivity({ day: day2, id: 'a2' }))

    expect(store.get(dayActivitiesAtom(day1))).toHaveLength(1)
    expect(store.get(dayActivitiesAtom(day2))).toHaveLength(1)
    expect(store.get(dayActivitiesAtom(day1))[0].id).toBe('a1')
    expect(store.get(dayActivitiesAtom(day2))[0].id).toBe('a2')
  })
})

// ----------------------------------------------------------------
// addActivityAtom
// ----------------------------------------------------------------

describe('addActivityAtom', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    // fresh store + fresh atomFamily state per test
    dayActivitiesAtom.remove('2024-01-15')
    dayActivitiesAtom.remove('2024-01-16')
    store = createStore()
  })

  it('adds an activity to the correct day atom', () => {
    const activity = makeActivity()
    store.set(addActivityAtom, activity)

    const result = store.get(dayActivitiesAtom('2024-01-15'))
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(activity)
  })

  it('appends multiple activities to the same day', () => {
    const a1 = makeActivity({ id: 'a1', startMin: 360 })
    const a2 = makeActivity({ id: 'a2', startMin: 480 })

    store.set(addActivityAtom, a1)
    store.set(addActivityAtom, a2)

    expect(store.get(dayActivitiesAtom('2024-01-15'))).toHaveLength(2)
  })

  it('does not affect other days when adding', () => {
    store.set(addActivityAtom, makeActivity({ day: '2024-01-15', id: 'a1' }))

    expect(store.get(dayActivitiesAtom('2024-01-16'))).toHaveLength(0)
  })
})

// ----------------------------------------------------------------
// updateActivityAtom
// ----------------------------------------------------------------

describe('updateActivityAtom', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    dayActivitiesAtom.remove('2024-01-15')
    store = createStore()
    // Seed one activity
    store.set(addActivityAtom, makeActivity({ id: 'act-1', title: 'Morning run' }))
  })

  it('updates the matching activity in-place', () => {
    const updated = makeActivity({ id: 'act-1', title: 'Evening run', startMin: 1080 })
    store.set(updateActivityAtom, updated)

    const result = store.get(dayActivitiesAtom('2024-01-15'))
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Evening run')
    expect(result[0].startMin).toBe(1080)
  })

  it('does not change the list length on update', () => {
    store.set(addActivityAtom, makeActivity({ id: 'act-2', startMin: 600 }))
    store.set(updateActivityAtom, makeActivity({ id: 'act-1', title: 'Updated' }))

    expect(store.get(dayActivitiesAtom('2024-01-15'))).toHaveLength(2)
  })

  it('is a no-op when id does not exist in the day', () => {
    store.set(updateActivityAtom, makeActivity({ id: 'nonexistent', title: 'Ghost' }))
    const result = store.get(dayActivitiesAtom('2024-01-15'))
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('act-1')
  })
})

// ----------------------------------------------------------------
// removeActivityAtom
// ----------------------------------------------------------------

describe('removeActivityAtom', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    dayActivitiesAtom.remove('2024-01-15')
    store = createStore()
    store.set(addActivityAtom, makeActivity({ id: 'act-1' }))
    store.set(addActivityAtom, makeActivity({ id: 'act-2', startMin: 480 }))
  })

  it('removes the activity with the given id from the correct day', () => {
    store.set(removeActivityAtom, { id: 'act-1', day: '2024-01-15' })

    const result = store.get(dayActivitiesAtom('2024-01-15'))
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('act-2')
  })

  it('is a no-op when id does not exist', () => {
    store.set(removeActivityAtom, { id: 'nonexistent', day: '2024-01-15' })
    expect(store.get(dayActivitiesAtom('2024-01-15'))).toHaveLength(2)
  })
})

// ----------------------------------------------------------------
// atomFamily.remove — cleanup
// ----------------------------------------------------------------

describe('atomFamily.remove', () => {
  it('cleans up the atom so a new store starts fresh', () => {
    // Populate atom in store1
    const store1 = createStore()
    store1.set(addActivityAtom, makeActivity({ day: '2024-01-20', id: 'a1' }))
    expect(store1.get(dayActivitiesAtom('2024-01-20'))).toHaveLength(1)

    // Remove the atom from the family
    dayActivitiesAtom.remove('2024-01-20')

    // A NEW store should see an empty atom (fresh initial value)
    const store2 = createStore()
    expect(store2.get(dayActivitiesAtom('2024-01-20'))).toEqual([])
  })
})
