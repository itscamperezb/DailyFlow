'use server'

import { eq } from 'drizzle-orm'
import { db } from '@/lib/drizzle/client'
import { activities } from '@/lib/drizzle/schema'
import type { ActivityStatus } from '@/atoms/calendar'

export async function dbMoveActivity(id: string, day: string, startMin: number) {
  await db.update(activities).set({ day, startMin }).where(eq(activities.id, id))
}

export async function dbResizeActivity(id: string, durationMin: number) {
  await db.update(activities).set({ durationMin }).where(eq(activities.id, id))
}

export async function dbUpdateActivityStatus(id: string, status: ActivityStatus) {
  await db.update(activities).set({ status }).where(eq(activities.id, id))
}

export async function dbCreateActivity(values: {
  id: string
  userId: string
  day: string
  title: string
  startMin: number
  durationMin: number
  categoryId: string | null
  status: ActivityStatus
}) {
  await db.insert(activities).values(values)
}

export async function dbUpdateActivity(id: string, updates: {
  title?: string
  startMin?: number
  durationMin?: number
  categoryId?: string | null
}) {
  await db.update(activities).set(updates).where(eq(activities.id, id))
}

export async function dbDeleteActivity(id: string) {
  await db.delete(activities).where(eq(activities.id, id))
}

export async function dbBatchCreateActivities(rows: Array<{
  id: string
  userId: string
  day: string
  title: string
  startMin: number
  durationMin: number
  categoryId: string | null
  status: ActivityStatus
}>) {
  if (rows.length === 0) return
  // Insert in chunks of 100 to avoid query size limits
  for (let i = 0; i < rows.length; i += 100) {
    await db.insert(activities).values(rows.slice(i, i + 100))
  }
}
