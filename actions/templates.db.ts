'use server'

import { eq } from 'drizzle-orm'
import { db } from '@/lib/drizzle/client'
import {
  weeklyTemplates,
  templateActivities,
  activities as activitiesTable,
} from '@/lib/drizzle/schema'

export async function dbSaveTemplate(
  userId: string,
  name: string,
  rows: Array<{
    dayOfWeek: number
    title: string
    startMin: number
    durationMin: number
    categoryId: string | null
  }>
): Promise<string> {
  const templateId = crypto.randomUUID()
  await db.insert(weeklyTemplates).values({ id: templateId, userId, name })
  if (rows.length > 0) {
    await db.insert(templateActivities).values(
      rows.map((r) => ({ ...r, templateId }))
    )
  }
  return templateId
}

export async function dbLoadTemplateActivities(templateId: string) {
  return db
    .select()
    .from(templateActivities)
    .where(eq(templateActivities.templateId, templateId))
}

export async function dbInsertActivities(
  rows: Array<{
    id: string
    userId: string
    day: string
    title: string
    startMin: number
    durationMin: number
    categoryId: string | null
    status: 'planned' | 'in_progress' | 'completed' | 'skipped'
  }>
) {
  if (rows.length === 0) return
  await db.insert(activitiesTable).values(rows)
}
