'use server'

import { eq } from 'drizzle-orm'
import { db } from '@/lib/drizzle/client'
import { categories as categoriesTable, activities as activitiesTable } from '@/lib/drizzle/schema'
import type { Category } from '@/atoms/categories'

export async function dbCreateCategory(values: {
  id: string
  userId: string
  name: string
  color: string
  icon: string
}) {
  await db.insert(categoriesTable).values(values)
}

export async function dbUpdateCategory(
  categoryId: string,
  updates: Partial<Pick<Category, 'name' | 'color' | 'icon'>>
) {
  await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, categoryId))
}

export async function dbDeleteCategory(categoryId: string) {
  await db.delete(activitiesTable).where(eq(activitiesTable.categoryId, categoryId))
  await db.delete(categoriesTable).where(eq(categoriesTable.id, categoryId))
}
