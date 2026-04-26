import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks BEFORE imports ---

vi.mock('@/lib/drizzle/client', () => ({
  db: {
    update: vi.fn(),
  },
}))

import { createStore } from 'jotai'
import { db } from '@/lib/drizzle/client'
import {
  dayActivitiesAtom,
  addActivityAtom,
} from '@/atoms/calendar'
import type { Activity } from '@/atoms/calendar'
import {
  moveActivity,
  resizeActivity,
  updateActivityStatus,
} from '@/actions/activities'

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

const DAY_A = '2024-01-15'
const DAY_B = '2024-01-16'

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1',
    userId: 'user-1',
    day: DAY_A,
    title: 'Morning run',
    startMin: 360,
    durationMin: 60,
    categoryId: 'cat-health',
    status: 'planned',
    createdAt: '2024-01-15T06:00:00Z',
    ...overrides,
  }
}

function buildUpdateChain(resolveWith: unknown = undefined) {
  const whereFn = vi.fn().mockResolvedValue(resolveWith)
  const setFn = vi.fn().mockReturnValue({ where: whereFn })
  const updateFn = vi.fn().mockReturnValue({ set: setFn })
  return { updateFn, setFn, whereFn }
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function freshStore(...activities: Activity[]) {
  // Remove atomFamily entries so each test starts fresh
  dayActivitiesAtom.remove(DAY_A)
  dayActivitiesAtom.remove(DAY_B)
  const store = createStore()
  for (const a of activities) {
    store.set(addActivityAtom, a)
  }
  return store
}

// ----------------------------------------------------------------
// moveActivity
// ----------------------------------------------------------------

describe('moveActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('optimistically moves activity to target day and updates startMin', async () => {
    const activity = makeActivity({ id: 'act-1', day: DAY_A, startMin: 360 })
    const store = freshStore(activity)

    const { updateFn } = buildUpdateChain()
    vi.mocked(db).update = updateFn as unknown as typeof db.update

    await moveActivity(store, 'act-1', DAY_A, DAY_B, 480)

    expect(store.get(dayActivitiesAtom(DAY_A))).toHaveLength(0)
    expect(store.get(dayActivitiesAtom(DAY_B))).toHaveLength(1)
    expect(store.get(dayActivitiesAtom(DAY_B))[0].startMin).toBe(480)
    expect(store.get(dayActivitiesAtom(DAY_B))[0].day).toBe(DAY_B)
  })

  it('calls db.update with the correct arguments', async () => {
    const activity = makeActivity({ id: 'act-1', day: DAY_A })
    const store = freshStore(activity)

    const { updateFn, setFn, whereFn } = buildUpdateChain()
    vi.mocked(db).update = updateFn as unknown as typeof db.update

    await moveActivity(store, 'act-1', DAY_A, DAY_B, 480)

    expect(updateFn).toHaveBeenCalledTimes(1)
    expect(setFn).toHaveBeenCalledWith(
      expect.objectContaining({ day: DAY_B, startMin: 480 })
    )
    expect(whereFn).toHaveBeenCalledTimes(1)
  })

  it('rolls back both atoms when db.update fails', async () => {
    const actA = makeActivity({ id: 'act-1', day: DAY_A, startMin: 360 })
    const store = freshStore(actA)

    const whereFn = vi.fn().mockRejectedValueOnce(new Error('DB error'))
    const setFn = vi.fn().mockReturnValue({ where: whereFn })
    const updateFn = vi.fn().mockReturnValue({ set: setFn })
    vi.mocked(db).update = updateFn as unknown as typeof db.update

    await expect(moveActivity(store, 'act-1', DAY_A, DAY_B, 480)).rejects.toThrow(
      'Failed to move activity'
    )

    // Source day should be restored
    expect(store.get(dayActivitiesAtom(DAY_A))).toHaveLength(1)
    expect(store.get(dayActivitiesAtom(DAY_A))[0].id).toBe('act-1')
    // Target day should be empty (rolled back)
    expect(store.get(dayActivitiesAtom(DAY_B))).toHaveLength(0)
  })

  it('moves within the same day (source === target)', async () => {
    const activity = makeActivity({ id: 'act-1', day: DAY_A, startMin: 360 })
    const store = freshStore(activity)

    const { updateFn } = buildUpdateChain()
    vi.mocked(db).update = updateFn as unknown as typeof db.update

    await moveActivity(store, 'act-1', DAY_A, DAY_A, 600)

    const dayState = store.get(dayActivitiesAtom(DAY_A))
    expect(dayState).toHaveLength(1)
    expect(dayState[0].startMin).toBe(600)
  })
})

// ----------------------------------------------------------------
// resizeActivity
// ----------------------------------------------------------------

describe('resizeActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('optimistically updates durationMin on the activity', async () => {
    const activity = makeActivity({ id: 'act-1', day: DAY_A, durationMin: 60 })
    const store = freshStore(activity)

    const { updateFn } = buildUpdateChain()
    vi.mocked(db).update = updateFn as unknown as typeof db.update

    await resizeActivity(store, 'act-1', DAY_A, 120)

    const dayState = store.get(dayActivitiesAtom(DAY_A))
    expect(dayState).toHaveLength(1)
    expect(dayState[0].durationMin).toBe(120)
  })

  it('calls db.update with the new durationMin', async () => {
    const activity = makeActivity({ id: 'act-1', day: DAY_A })
    const store = freshStore(activity)

    const { updateFn, setFn } = buildUpdateChain()
    vi.mocked(db).update = updateFn as unknown as typeof db.update

    await resizeActivity(store, 'act-1', DAY_A, 90)

    expect(setFn).toHaveBeenCalledWith(
      expect.objectContaining({ durationMin: 90 })
    )
  })

  it('rolls back to original durationMin when db.update fails', async () => {
    const activity = makeActivity({ id: 'act-1', day: DAY_A, durationMin: 60 })
    const store = freshStore(activity)

    const whereFn = vi.fn().mockRejectedValueOnce(new Error('DB error'))
    const setFn = vi.fn().mockReturnValue({ where: whereFn })
    const updateFn = vi.fn().mockReturnValue({ set: setFn })
    vi.mocked(db).update = updateFn as unknown as typeof db.update

    await expect(resizeActivity(store, 'act-1', DAY_A, 120)).rejects.toThrow(
      'Failed to resize activity'
    )

    const dayState = store.get(dayActivitiesAtom(DAY_A))
    expect(dayState).toHaveLength(1)
    expect(dayState[0].durationMin).toBe(60)
  })
})

// ----------------------------------------------------------------
// updateActivityStatus
// ----------------------------------------------------------------

describe('updateActivityStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('optimistically updates activity status', async () => {
    const activity = makeActivity({ id: 'act-1', day: DAY_A, status: 'planned' })
    const store = freshStore(activity)

    const { updateFn } = buildUpdateChain()
    vi.mocked(db).update = updateFn as unknown as typeof db.update

    await updateActivityStatus(store, 'act-1', DAY_A, 'completed')

    const dayState = store.get(dayActivitiesAtom(DAY_A))
    expect(dayState[0].status).toBe('completed')
  })

  it('calls db.update with the new status', async () => {
    const activity = makeActivity({ id: 'act-1', day: DAY_A, status: 'planned' })
    const store = freshStore(activity)

    const { updateFn, setFn } = buildUpdateChain()
    vi.mocked(db).update = updateFn as unknown as typeof db.update

    await updateActivityStatus(store, 'act-1', DAY_A, 'in_progress')

    expect(setFn).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'in_progress' })
    )
  })

  it('rolls back to original status when db.update fails', async () => {
    const activity = makeActivity({ id: 'act-1', day: DAY_A, status: 'planned' })
    const store = freshStore(activity)

    const whereFn = vi.fn().mockRejectedValueOnce(new Error('DB error'))
    const setFn = vi.fn().mockReturnValue({ where: whereFn })
    const updateFn = vi.fn().mockReturnValue({ set: setFn })
    vi.mocked(db).update = updateFn as unknown as typeof db.update

    await expect(
      updateActivityStatus(store, 'act-1', DAY_A, 'completed')
    ).rejects.toThrow('Failed to update activity status')

    const dayState = store.get(dayActivitiesAtom(DAY_A))
    expect(dayState[0].status).toBe('planned')
  })
})
