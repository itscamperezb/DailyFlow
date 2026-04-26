import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks BEFORE imports ---

vi.mock('@/lib/drizzle/client', () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

import { createStore } from 'jotai'
import { db } from '@/lib/drizzle/client'
import { categoriesAtom } from '@/atoms/categories'
import type { Category } from '@/atoms/categories'
import { dayActivitiesAtom, addActivityAtom } from '@/atoms/calendar'
import type { Activity } from '@/atoms/calendar'
import { createCategory, updateCategory, deleteCategory } from '@/actions/categories'

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

const USER_ID = 'user-1'
const DAY_A = '2024-01-15'
const DAY_B = '2024-01-16'
const WEEK_DAYS = [DAY_A, DAY_B]

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
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
    title: 'Morning run',
    startMin: 360,
    durationMin: 60,
    categoryId: 'cat-1',
    status: 'planned',
    createdAt: '2024-01-15T06:00:00Z',
    ...overrides,
  }
}

function freshStore(categories: Category[] = [], activities: Activity[] = []) {
  // Clean up atomFamily entries
  dayActivitiesAtom.remove(DAY_A)
  dayActivitiesAtom.remove(DAY_B)
  const store = createStore()
  store.set(categoriesAtom, categories)
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

function buildUpdateChain(resolveWith: unknown = undefined) {
  const whereFn = vi.fn().mockResolvedValue(resolveWith)
  const setFn = vi.fn().mockReturnValue({ where: whereFn })
  const updateFn = vi.fn().mockReturnValue({ set: setFn })
  return { updateFn, setFn, whereFn }
}

function buildDeleteChain(resolveWith: unknown = undefined) {
  const whereFn = vi.fn().mockResolvedValue(resolveWith)
  const deleteFn = vi.fn().mockReturnValue({ where: whereFn })
  return { deleteFn, whereFn }
}

// ----------------------------------------------------------------
// createCategory
// ----------------------------------------------------------------

describe('createCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a new Category with generated id and createdAt', async () => {
    const { insertFn } = buildInsertChain()
    vi.mocked(db).insert = insertFn as unknown as typeof db.insert
    const store = freshStore()

    const result = await createCategory(
      store,
      { name: 'Work', color: '#3b82f6', icon: 'briefcase' },
      USER_ID
    )

    expect(result.id).toBeDefined()
    expect(result.id).not.toBe('')
    expect(result.createdAt).toBeDefined()
    expect(result.name).toBe('Work')
    expect(result.color).toBe('#3b82f6')
    expect(result.icon).toBe('briefcase')
    expect(result.userId).toBe(USER_ID)
  })

  it('adds the category to categoriesAtom immediately (optimistic)', async () => {
    const { insertFn } = buildInsertChain()
    vi.mocked(db).insert = insertFn as unknown as typeof db.insert
    const store = freshStore()

    const created = await createCategory(
      store,
      { name: 'Health', color: '#22c55e', icon: 'dumbbell' },
      USER_ID
    )

    const cats = store.get(categoriesAtom)
    expect(cats).toHaveLength(1)
    expect(cats[0].id).toBe(created.id)
    expect(cats[0].name).toBe('Health')
  })

  it('calls db.insert with correct category data', async () => {
    const { insertFn, valuesFn } = buildInsertChain()
    vi.mocked(db).insert = insertFn as unknown as typeof db.insert
    const store = freshStore()

    const created = await createCategory(
      store,
      { name: 'Work', color: '#3b82f6', icon: 'briefcase' },
      USER_ID
    )

    expect(insertFn).toHaveBeenCalledTimes(1)
    expect(valuesFn).toHaveBeenCalledWith(
      expect.objectContaining({
        id: created.id,
        userId: USER_ID,
        name: 'Work',
        color: '#3b82f6',
        icon: 'briefcase',
      })
    )
  })

  it('rolls back atom and throws when db.insert fails', async () => {
    const valuesFn = vi.fn().mockRejectedValueOnce(new Error('DB error'))
    const insertFn = vi.fn().mockReturnValue({ values: valuesFn })
    vi.mocked(db).insert = insertFn as unknown as typeof db.insert
    const store = freshStore()

    await expect(
      createCategory(store, { name: 'Work', color: '#3b82f6', icon: 'briefcase' }, USER_ID)
    ).rejects.toThrow('Failed to create category')

    expect(store.get(categoriesAtom)).toHaveLength(0)
  })

  it('appends to existing categories', async () => {
    const { insertFn } = buildInsertChain()
    vi.mocked(db).insert = insertFn as unknown as typeof db.insert
    const existing = makeCategory({ id: 'cat-existing', name: 'Existing' })
    const store = freshStore([existing])

    await createCategory(
      store,
      { name: 'New', color: '#ff0000', icon: 'star' },
      USER_ID
    )

    expect(store.get(categoriesAtom)).toHaveLength(2)
  })
})

// ----------------------------------------------------------------
// updateCategory
// ----------------------------------------------------------------

describe('updateCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates category name in atom', async () => {
    const { updateFn } = buildUpdateChain()
    vi.mocked(db).update = updateFn as unknown as typeof db.update
    const cat = makeCategory({ id: 'cat-1', name: 'Old Name' })
    const store = freshStore([cat])

    await updateCategory(store, 'cat-1', { name: 'New Name' })

    const cats = store.get(categoriesAtom)
    expect(cats[0].name).toBe('New Name')
  })

  it('updates category color in atom', async () => {
    const { updateFn } = buildUpdateChain()
    vi.mocked(db).update = updateFn as unknown as typeof db.update
    const cat = makeCategory({ id: 'cat-1', color: '#000000' })
    const store = freshStore([cat])

    await updateCategory(store, 'cat-1', { color: '#ffffff' })

    const cats = store.get(categoriesAtom)
    expect(cats[0].color).toBe('#ffffff')
  })

  it('updates category icon in atom', async () => {
    const { updateFn } = buildUpdateChain()
    vi.mocked(db).update = updateFn as unknown as typeof db.update
    const cat = makeCategory({ id: 'cat-1', icon: 'old-icon' })
    const store = freshStore([cat])

    await updateCategory(store, 'cat-1', { icon: 'new-icon' })

    const cats = store.get(categoriesAtom)
    expect(cats[0].icon).toBe('new-icon')
  })

  it('calls db.update with the correct fields', async () => {
    const { updateFn, setFn } = buildUpdateChain()
    vi.mocked(db).update = updateFn as unknown as typeof db.update
    const cat = makeCategory({ id: 'cat-1' })
    const store = freshStore([cat])

    await updateCategory(store, 'cat-1', { name: 'Updated', color: '#aabbcc' })

    expect(updateFn).toHaveBeenCalledTimes(1)
    expect(setFn).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Updated', color: '#aabbcc' })
    )
  })

  it('rolls back to original when db.update fails', async () => {
    const whereFn = vi.fn().mockRejectedValueOnce(new Error('DB error'))
    const setFn = vi.fn().mockReturnValue({ where: whereFn })
    const updateFn = vi.fn().mockReturnValue({ set: setFn })
    vi.mocked(db).update = updateFn as unknown as typeof db.update
    const cat = makeCategory({ id: 'cat-1', name: 'Original' })
    const store = freshStore([cat])

    await expect(updateCategory(store, 'cat-1', { name: 'New' })).rejects.toThrow(
      'Failed to update category'
    )

    expect(store.get(categoriesAtom)[0].name).toBe('Original')
  })
})

// ----------------------------------------------------------------
// deleteCategory
// ----------------------------------------------------------------

describe('deleteCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('removes category from categoriesAtom', async () => {
    const { deleteFn } = buildDeleteChain()
    vi.mocked(db).delete = deleteFn as unknown as typeof db.delete
    const cat = makeCategory({ id: 'cat-1' })
    const store = freshStore([cat])

    await deleteCategory(store, 'cat-1', WEEK_DAYS)

    expect(store.get(categoriesAtom)).toHaveLength(0)
  })

  it('nullifies categoryId on affected activities in all week day atoms', async () => {
    const { deleteFn } = buildDeleteChain()
    vi.mocked(db).delete = deleteFn as unknown as typeof db.delete
    const cat = makeCategory({ id: 'cat-1' })
    const actA = makeActivity({ id: 'act-a', day: DAY_A, categoryId: 'cat-1' })
    const actB = makeActivity({ id: 'act-b', day: DAY_B, categoryId: 'cat-1' })
    const unrelated = makeActivity({ id: 'act-c', day: DAY_A, categoryId: 'cat-2' })
    const store = freshStore([cat], [actA, actB, unrelated])

    await deleteCategory(store, 'cat-1', WEEK_DAYS)

    const dayA = store.get(dayActivitiesAtom(DAY_A))
    const dayB = store.get(dayActivitiesAtom(DAY_B))

    // Activities are not deleted, just their categoryId is nulled
    expect(dayA).toHaveLength(2)
    expect(dayA.find((a) => a.id === 'act-a')?.categoryId).toBeNull()
    // Unrelated activity should not change
    expect(dayA.find((a) => a.id === 'act-c')?.categoryId).toBe('cat-2')
    expect(dayB.find((a) => a.id === 'act-b')?.categoryId).toBeNull()
  })

  it('calls db.delete with the correct category id', async () => {
    const { deleteFn, whereFn } = buildDeleteChain()
    vi.mocked(db).delete = deleteFn as unknown as typeof db.delete
    const cat = makeCategory({ id: 'cat-1' })
    const store = freshStore([cat])

    await deleteCategory(store, 'cat-1', WEEK_DAYS)

    expect(deleteFn).toHaveBeenCalledTimes(1)
    expect(whereFn).toHaveBeenCalledTimes(1)
  })

  it('rolls back categoriesAtom on db failure', async () => {
    const whereFn = vi.fn().mockRejectedValueOnce(new Error('DB error'))
    const deleteFn = vi.fn().mockReturnValue({ where: whereFn })
    vi.mocked(db).delete = deleteFn as unknown as typeof db.delete
    const cat = makeCategory({ id: 'cat-1' })
    const store = freshStore([cat])

    await expect(deleteCategory(store, 'cat-1', WEEK_DAYS)).rejects.toThrow(
      'Failed to delete category'
    )

    expect(store.get(categoriesAtom)).toHaveLength(1)
    expect(store.get(categoriesAtom)[0].id).toBe('cat-1')
  })

  it('rolls back activity atoms on db failure', async () => {
    const whereFn = vi.fn().mockRejectedValueOnce(new Error('DB error'))
    const deleteFn = vi.fn().mockReturnValue({ where: whereFn })
    vi.mocked(db).delete = deleteFn as unknown as typeof db.delete
    const cat = makeCategory({ id: 'cat-1' })
    const act = makeActivity({ id: 'act-1', day: DAY_A, categoryId: 'cat-1' })
    const store = freshStore([cat], [act])

    await expect(deleteCategory(store, 'cat-1', WEEK_DAYS)).rejects.toThrow(
      'Failed to delete category'
    )

    // Activity should have original categoryId restored
    expect(store.get(dayActivitiesAtom(DAY_A))[0].categoryId).toBe('cat-1')
  })
})
