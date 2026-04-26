/**
 * Integration test: delete category → cascade nullify on activities
 *
 * Uses a real Jotai store. Only the DB layer (Drizzle) is mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mock DB BEFORE imports ---
vi.mock('@/lib/drizzle/client', () => ({
  db: {
    delete: vi.fn(),
  },
}))

import { createStore } from 'jotai'
import { db } from '@/lib/drizzle/client'
import { categoriesAtom } from '@/atoms/categories'
import type { Category } from '@/atoms/categories'
import { dayActivitiesAtom, addActivityAtom } from '@/atoms/calendar'
import type { Activity } from '@/atoms/calendar'
import { deleteCategory } from '@/actions/categories'

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

const CAT_ID = 'cat-work'
const OTHER_CAT_ID = 'cat-health'
const USER_ID = 'user-1'
const DAY_A = '2024-03-11'
const DAY_B = '2024-03-12'
const WEEK_DAYS = [DAY_A, DAY_B]

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: CAT_ID,
    userId: USER_ID,
    name: 'Work',
    color: '#3b82f6',
    icon: 'briefcase',
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1',
    userId: USER_ID,
    day: DAY_A,
    title: 'Morning task',
    startMin: 480,
    durationMin: 60,
    categoryId: CAT_ID,
    status: 'planned',
    createdAt: '2024-03-11T08:00:00Z',
    ...overrides,
  }
}

function buildDeleteChain(resolveWith: unknown = undefined) {
  const whereFn = vi.fn().mockResolvedValue(resolveWith)
  const deleteFn = vi.fn().mockReturnValue({ where: whereFn })
  return { deleteFn, whereFn }
}

function freshStore(cats: Category[], activities: Activity[]) {
  dayActivitiesAtom.remove(DAY_A)
  dayActivitiesAtom.remove(DAY_B)
  const store = createStore()
  store.set(categoriesAtom, cats)
  for (const a of activities) {
    store.set(addActivityAtom, a)
  }
  return store
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe('deleteCategory cascade integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('removes the category from categoriesAtom', async () => {
    const cat = makeCategory()
    const store = freshStore([cat], [])
    const { deleteFn } = buildDeleteChain()
    vi.mocked(db).delete = deleteFn as unknown as typeof db.delete

    await deleteCategory(store, CAT_ID, WEEK_DAYS)

    expect(store.get(categoriesAtom)).toHaveLength(0)
  })

  it('nullifies categoryId on affected activities in all week atoms', async () => {
    const cat = makeCategory()
    const actA = makeActivity({ id: 'act-a', day: DAY_A, categoryId: CAT_ID })
    const actB = makeActivity({ id: 'act-b', day: DAY_B, categoryId: CAT_ID })
    const store = freshStore([cat], [actA, actB])
    const { deleteFn } = buildDeleteChain()
    vi.mocked(db).delete = deleteFn as unknown as typeof db.delete

    await deleteCategory(store, CAT_ID, WEEK_DAYS)

    const dayAActivities = store.get(dayActivitiesAtom(DAY_A))
    const dayBActivities = store.get(dayActivitiesAtom(DAY_B))

    // Activities are NOT deleted — just their categoryId is nulled
    expect(dayAActivities).toHaveLength(1)
    expect(dayAActivities[0].categoryId).toBeNull()

    expect(dayBActivities).toHaveLength(1)
    expect(dayBActivities[0].categoryId).toBeNull()
  })

  it('does NOT nullify unrelated activities (different categoryId)', async () => {
    const cat = makeCategory()
    const workAct = makeActivity({ id: 'act-work', day: DAY_A, categoryId: CAT_ID })
    const healthAct = makeActivity({ id: 'act-health', day: DAY_A, categoryId: OTHER_CAT_ID })
    const store = freshStore([cat], [workAct, healthAct])
    const { deleteFn } = buildDeleteChain()
    vi.mocked(db).delete = deleteFn as unknown as typeof db.delete

    await deleteCategory(store, CAT_ID, WEEK_DAYS)

    const dayA = store.get(dayActivitiesAtom(DAY_A))
    const work = dayA.find((a) => a.id === 'act-work')
    const health = dayA.find((a) => a.id === 'act-health')

    expect(work?.categoryId).toBeNull()
    expect(health?.categoryId).toBe(OTHER_CAT_ID)  // unchanged
  })

  it('makes the DB delete call (cascade is handled by DB FK ON DELETE SET NULL)', async () => {
    const cat = makeCategory()
    const store = freshStore([cat], [])
    const { deleteFn, whereFn } = buildDeleteChain()
    vi.mocked(db).delete = deleteFn as unknown as typeof db.delete

    await deleteCategory(store, CAT_ID, WEEK_DAYS)

    expect(deleteFn).toHaveBeenCalledTimes(1)
    expect(whereFn).toHaveBeenCalledTimes(1)
  })

  it('rolls back categoriesAtom and activity atoms on DB failure', async () => {
    const cat = makeCategory()
    const act = makeActivity({ id: 'act-a', day: DAY_A, categoryId: CAT_ID })
    const store = freshStore([cat], [act])

    const whereFn = vi.fn().mockRejectedValueOnce(new Error('FK constraint'))
    const deleteFn = vi.fn().mockReturnValue({ where: whereFn })
    vi.mocked(db).delete = deleteFn as unknown as typeof db.delete

    await expect(deleteCategory(store, CAT_ID, WEEK_DAYS)).rejects.toThrow(
      'Failed to delete category'
    )

    // Category must be restored
    expect(store.get(categoriesAtom)).toHaveLength(1)
    expect(store.get(categoriesAtom)[0].id).toBe(CAT_ID)

    // Activity categoryId must be restored
    expect(store.get(dayActivitiesAtom(DAY_A))[0].categoryId).toBe(CAT_ID)
  })
})
