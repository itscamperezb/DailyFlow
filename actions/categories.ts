import { createStore } from 'jotai'
import { categoriesAtom } from '@/atoms/categories'
import type { Category } from '@/atoms/categories'
import { dayActivitiesAtom } from '@/atoms/calendar'
import { dbCreateCategory, dbUpdateCategory, dbDeleteCategory } from './categories.db'

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

type JotaiStore = ReturnType<typeof createStore>

// ----------------------------------------------------------------
// createCategory
// ----------------------------------------------------------------

/**
 * Creates a new category with a client-side UUID.
 * Pattern: generate id → optimistic add → persist → rollback on failure
 */
export async function createCategory(
  store: JotaiStore,
  input: Omit<Category, 'id' | 'userId' | 'createdAt'>,
  userId: string
): Promise<Category> {
  // 1. Generate client-side id
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const newCategory: Category = { ...input, id, userId, createdAt }

  // 2. Optimistic add
  store.set(categoriesAtom, (prev) => [...prev, newCategory])

  // 3. Persist
  try {
    await dbCreateCategory({
      id: newCategory.id,
      userId: newCategory.userId,
      name: newCategory.name,
      color: newCategory.color,
      icon: newCategory.icon,
    })
  } catch {
    // 4. Rollback
    store.set(categoriesAtom, (prev) => prev.filter((c) => c.id !== id))
    throw new Error('Failed to create category')
  }

  return newCategory
}

// ----------------------------------------------------------------
// updateCategory
// ----------------------------------------------------------------

/**
 * Updates name/color/icon of an existing category.
 * Pattern: snapshot → optimistic update → persist → rollback on failure
 */
export async function updateCategory(
  store: JotaiStore,
  categoryId: string,
  updates: Partial<Pick<Category, 'name' | 'color' | 'icon'>>
): Promise<void> {
  // 1. Snapshot
  const snapshot = store.get(categoriesAtom)

  // 2. Optimistic update
  store.set(categoriesAtom, (prev) =>
    prev.map((c) => (c.id === categoryId ? { ...c, ...updates } : c))
  )

  // 3. Persist
  try {
    await dbUpdateCategory(categoryId, updates)
  } catch {
    // 4. Rollback
    store.set(categoriesAtom, snapshot)
    throw new Error('Failed to update category')
  }
}

// ----------------------------------------------------------------
// deleteCategory
// ----------------------------------------------------------------

/**
 * Deletes a category and nullifies categoryId on affected activities.
 * The DB has ON DELETE SET NULL on activities.categoryId FK — so
 * the DB handles nullification; we mirror this optimistically in atoms.
 *
 * Pattern: snapshot → optimistic → persist → rollback on failure
 *
 * @param weekDays - ISO date strings for the currently displayed week,
 *   needed to know which dayActivitiesAtom keys to update
 */
export async function deleteCategory(
  store: JotaiStore,
  categoryId: string,
  weekDays: string[]
): Promise<void> {
  // 1. Snapshot
  const categoriesSnapshot = store.get(categoriesAtom)
  const daySnapshots = weekDays.map((day) => ({
    day,
    activities: store.get(dayActivitiesAtom(day)),
  }))

  // 2. Optimistic update — remove from categoriesAtom
  store.set(categoriesAtom, (prev) => prev.filter((c) => c.id !== categoryId))

  // 3. Optimistic update — remove activities of this category
  for (const { day, activities } of daySnapshots) {
    store.set(dayActivitiesAtom(day), activities.filter((a) => a.categoryId !== categoryId))
  }

  // 4. Persist — delete activities then category
  try {
    await dbDeleteCategory(categoryId)
  } catch {
    // 5. Rollback both atoms
    store.set(categoriesAtom, categoriesSnapshot)
    for (const { day, activities } of daySnapshots) {
      store.set(dayActivitiesAtom(day), activities)
    }
    throw new Error('Failed to delete category')
  }
}
