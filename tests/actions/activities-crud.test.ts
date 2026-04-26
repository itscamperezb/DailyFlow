import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks BEFORE imports ---

vi.mock('@/lib/drizzle/client', () => ({
  db: {
    insert: vi.fn(),
    delete: vi.fn(),
  },
}))

import { createStore } from 'jotai'
import { db } from '@/lib/drizzle/client'
import {
  dayActivitiesAtom,
  addActivityAtom,
} from '@/atoms/calendar'
import type { Activity } from '@/atoms/calendar'
import { createActivity, deleteActivity } from '@/actions/activities'

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

const DAY_A = '2024-01-15'

function makeInput(
  overrides: Partial<Omit<Activity, 'id' | 'createdAt'>> = {}
): Omit<Activity, 'id' | 'createdAt'> {
  return {
    userId: 'user-1',
    day: DAY_A,
    title: 'Morning run',
    startMin: 360,
    durationMin: 60,
    categoryId: 'cat-health',
    status: 'planned',
    ...overrides,
  }
}

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-existing',
    userId: 'user-1',
    day: DAY_A,
    title: 'Existing',
    startMin: 360,
    durationMin: 60,
    categoryId: 'cat-health',
    status: 'planned',
    createdAt: '2024-01-15T06:00:00Z',
    ...overrides,
  }
}

function freshStore(...activities: Activity[]) {
  dayActivitiesAtom.remove(DAY_A)
  const store = createStore()
  for (const a of activities) {
    store.set(addActivityAtom, a)
  }
  return store
}

function buildInsertChain(resolveWith: unknown = undefined) {
  const valuesFn = vi.fn().mockResolvedValue(resolveWith)
  const insertFn = vi.fn().mockReturnValue({ values: valuesFn })
  return { insertFn, valuesFn }
}

function buildDeleteChain(resolveWith: unknown = undefined) {
  const whereFn = vi.fn().mockResolvedValue(resolveWith)
  const deleteFn = vi.fn().mockReturnValue({ where: whereFn })
  return { deleteFn, whereFn }
}

// ----------------------------------------------------------------
// createActivity
// ----------------------------------------------------------------

describe('createActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a new Activity with a generated id and createdAt', async () => {
    const { insertFn } = buildInsertChain()
    vi.mocked(db).insert = insertFn as unknown as typeof db.insert
    const store = freshStore()

    const result = await createActivity(store, makeInput())

    expect(result.id).toBeDefined()
    expect(result.id).not.toBe('')
    expect(result.createdAt).toBeDefined()
    expect(result.title).toBe('Morning run')
    expect(result.day).toBe(DAY_A)
  })

  it('adds the activity to the atom immediately (optimistic)', async () => {
    const { insertFn } = buildInsertChain()
    vi.mocked(db).insert = insertFn as unknown as typeof db.insert
    const store = freshStore()

    const created = await createActivity(store, makeInput())

    const dayState = store.get(dayActivitiesAtom(DAY_A))
    expect(dayState).toHaveLength(1)
    expect(dayState[0].id).toBe(created.id)
  })

  it('calls db.insert with the new activity data', async () => {
    const { insertFn, valuesFn } = buildInsertChain()
    vi.mocked(db).insert = insertFn as unknown as typeof db.insert
    const store = freshStore()

    const created = await createActivity(store, makeInput())

    expect(insertFn).toHaveBeenCalledTimes(1)
    expect(valuesFn).toHaveBeenCalledWith(
      expect.objectContaining({ id: created.id, title: 'Morning run' })
    )
  })

  it('rolls back atom and throws when db.insert fails', async () => {
    const valuesFn = vi.fn().mockRejectedValueOnce(new Error('DB error'))
    const insertFn = vi.fn().mockReturnValue({ values: valuesFn })
    vi.mocked(db).insert = insertFn as unknown as typeof db.insert
    const store = freshStore()

    await expect(createActivity(store, makeInput())).rejects.toThrow(
      'Failed to create activity'
    )

    // Activity should have been removed on rollback
    expect(store.get(dayActivitiesAtom(DAY_A))).toHaveLength(0)
  })
})

// ----------------------------------------------------------------
// deleteActivity
// ----------------------------------------------------------------

describe('deleteActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('removes the activity from the atom immediately (optimistic)', async () => {
    const activity = makeActivity({ id: 'act-1' })
    const store = freshStore(activity)

    const { deleteFn } = buildDeleteChain()
    vi.mocked(db).delete = deleteFn as unknown as typeof db.delete

    await deleteActivity(store, 'act-1', DAY_A)

    expect(store.get(dayActivitiesAtom(DAY_A))).toHaveLength(0)
  })

  it('calls db.delete with the correct activity id', async () => {
    const activity = makeActivity({ id: 'act-1' })
    const store = freshStore(activity)

    const { deleteFn, whereFn } = buildDeleteChain()
    vi.mocked(db).delete = deleteFn as unknown as typeof db.delete

    await deleteActivity(store, 'act-1', DAY_A)

    expect(deleteFn).toHaveBeenCalledTimes(1)
    expect(whereFn).toHaveBeenCalledTimes(1)
  })

  it('rolls back the atom when db.delete fails', async () => {
    const activity = makeActivity({ id: 'act-1' })
    const store = freshStore(activity)

    const whereFn = vi.fn().mockRejectedValueOnce(new Error('DB error'))
    const deleteFn = vi.fn().mockReturnValue({ where: whereFn })
    vi.mocked(db).delete = deleteFn as unknown as typeof db.delete

    await expect(deleteActivity(store, 'act-1', DAY_A)).rejects.toThrow(
      'Failed to delete activity'
    )

    // Activity should be restored
    const dayState = store.get(dayActivitiesAtom(DAY_A))
    expect(dayState).toHaveLength(1)
    expect(dayState[0].id).toBe('act-1')
  })

  it('is a no-op on atom when activity does not exist', async () => {
    const store = freshStore() // empty

    const { deleteFn } = buildDeleteChain()
    vi.mocked(db).delete = deleteFn as unknown as typeof db.delete

    await deleteActivity(store, 'nonexistent', DAY_A)

    expect(store.get(dayActivitiesAtom(DAY_A))).toHaveLength(0)
  })
})
