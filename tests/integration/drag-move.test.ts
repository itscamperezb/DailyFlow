/**
 * Integration test: drag activity across DayColumns
 *
 * Tests the moveActivity action with a real Jotai store.
 * Only the DB layer (Drizzle) is mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mock DB BEFORE imports ---
vi.mock('@/lib/drizzle/client', () => ({
  db: {
    update: vi.fn(),
  },
}))

import { createStore } from 'jotai'
import { db } from '@/lib/drizzle/client'
import { dayActivitiesAtom, addActivityAtom } from '@/atoms/calendar'
import type { Activity } from '@/atoms/calendar'
import { moveActivity } from '@/actions/activities'

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

const SOURCE_DAY = '2024-03-11'  // Monday
const TARGET_DAY = '2024-03-12'  // Tuesday

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-drag',
    userId: 'user-1',
    day: SOURCE_DAY,
    title: 'Dragged Activity',
    startMin: 480,   // 08:00
    durationMin: 60,
    categoryId: 'cat-1',
    status: 'planned',
    createdAt: '2024-03-11T08:00:00Z',
    ...overrides,
  }
}

function buildUpdateChain(resolveWith: unknown = undefined) {
  const whereFn = vi.fn().mockResolvedValue(resolveWith)
  const setFn = vi.fn().mockReturnValue({ where: whereFn })
  const updateFn = vi.fn().mockReturnValue({ set: setFn })
  return { updateFn, setFn, whereFn }
}

function freshStore(...activities: Activity[]) {
  dayActivitiesAtom.remove(SOURCE_DAY)
  dayActivitiesAtom.remove(TARGET_DAY)
  const store = createStore()
  for (const a of activities) {
    store.set(addActivityAtom, a)
  }
  return store
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe('drag activity integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('moves activity from source day atom to target day atom', async () => {
    const activity = makeActivity()
    const store = freshStore(activity)
    const { updateFn } = buildUpdateChain()
    vi.mocked(db).update = updateFn as unknown as typeof db.update

    await moveActivity(store, 'act-drag', SOURCE_DAY, TARGET_DAY, 540)

    // Source day must be empty
    expect(store.get(dayActivitiesAtom(SOURCE_DAY))).toHaveLength(0)

    // Target day must have the activity with updated startMin
    const targetActivities = store.get(dayActivitiesAtom(TARGET_DAY))
    expect(targetActivities).toHaveLength(1)
    expect(targetActivities[0].id).toBe('act-drag')
    expect(targetActivities[0].startMin).toBe(540)
    expect(targetActivities[0].day).toBe(TARGET_DAY)
  })

  it('rolls back BOTH atoms when Supabase/DB rejects the update', async () => {
    const activity = makeActivity()
    const store = freshStore(activity)

    // Force DB to reject
    const whereFn = vi.fn().mockRejectedValueOnce(new Error('Supabase error'))
    const setFn = vi.fn().mockReturnValue({ where: whereFn })
    const updateFn = vi.fn().mockReturnValue({ set: setFn })
    vi.mocked(db).update = updateFn as unknown as typeof db.update

    await expect(
      moveActivity(store, 'act-drag', SOURCE_DAY, TARGET_DAY, 540)
    ).rejects.toThrow('Failed to move activity')

    // Source atom must be RESTORED with original activity
    const sourceActivities = store.get(dayActivitiesAtom(SOURCE_DAY))
    expect(sourceActivities).toHaveLength(1)
    expect(sourceActivities[0].id).toBe('act-drag')
    expect(sourceActivities[0].startMin).toBe(480)  // original startMin
    expect(sourceActivities[0].day).toBe(SOURCE_DAY)

    // Target atom must be EMPTY (rolled back)
    expect(store.get(dayActivitiesAtom(TARGET_DAY))).toHaveLength(0)
  })

  it('leaves other activities in source day untouched when dragging one out', async () => {
    const dragged = makeActivity({ id: 'act-drag', startMin: 480 })
    const staying = makeActivity({ id: 'act-stay', startMin: 600, title: 'Stay here' })
    const store = freshStore(dragged, staying)

    const { updateFn } = buildUpdateChain()
    vi.mocked(db).update = updateFn as unknown as typeof db.update

    await moveActivity(store, 'act-drag', SOURCE_DAY, TARGET_DAY, 540)

    // Source day still has the non-dragged activity
    const sourceActivities = store.get(dayActivitiesAtom(SOURCE_DAY))
    expect(sourceActivities).toHaveLength(1)
    expect(sourceActivities[0].id).toBe('act-stay')
  })

  it('leaves other activities in source day when DB rejects (rollback preserves all)', async () => {
    const dragged = makeActivity({ id: 'act-drag', startMin: 480 })
    const staying = makeActivity({ id: 'act-stay', startMin: 600 })
    const store = freshStore(dragged, staying)

    const whereFn = vi.fn().mockRejectedValueOnce(new Error('DB down'))
    const setFn = vi.fn().mockReturnValue({ where: whereFn })
    const updateFn = vi.fn().mockReturnValue({ set: setFn })
    vi.mocked(db).update = updateFn as unknown as typeof db.update

    await expect(
      moveActivity(store, 'act-drag', SOURCE_DAY, TARGET_DAY, 540)
    ).rejects.toThrow()

    // Source day fully restored — both activities back
    expect(store.get(dayActivitiesAtom(SOURCE_DAY))).toHaveLength(2)
    expect(store.get(dayActivitiesAtom(TARGET_DAY))).toHaveLength(0)
  })
})
