import { createStore } from 'jotai'
import { dayActivitiesAtom, addActivityAtom } from '@/atoms/calendar'
import type { Activity } from '@/atoms/calendar'
import { dbSaveTemplate, dbLoadTemplateActivities, dbInsertActivities } from './templates.db'

type JotaiStore = ReturnType<typeof createStore>

export async function saveTemplate(
  store: JotaiStore,
  weekDays: string[],
  name: string,
  userId: string
): Promise<string> {
  const rows: Array<{
    dayOfWeek: number
    title: string
    startMin: number
    durationMin: number
    categoryId: string | null
  }> = []

  weekDays.forEach((day, index) => {
    store.get(dayActivitiesAtom(day)).forEach((activity) => {
      rows.push({
        dayOfWeek: index,
        title: activity.title,
        startMin: activity.startMin,
        durationMin: activity.durationMin,
        categoryId: activity.categoryId ?? null,
      })
    })
  })

  return dbSaveTemplate(userId, name, rows)
}

export async function applyTemplate(
  store: JotaiStore,
  templateId: string,
  targetWeekDays: string[]
): Promise<void> {
  const templateRows = await dbLoadTemplateActivities(templateId)
  if (!templateRows || templateRows.length === 0) return

  const now = new Date().toISOString()
  const newActivities: Activity[] = templateRows.map((row) => ({
    id: crypto.randomUUID(),
    userId: '',
    day: targetWeekDays[row.dayOfWeek],
    title: row.title,
    startMin: row.startMin,
    durationMin: row.durationMin,
    categoryId: row.categoryId ?? '',
    status: 'planned' as const,
    createdAt: now,
  }))

  await dbInsertActivities(
    newActivities.map((a) => ({
      id: a.id,
      userId: a.userId,
      day: a.day,
      title: a.title,
      startMin: a.startMin,
      durationMin: a.durationMin,
      categoryId: a.categoryId || null,
      status: a.status,
    }))
  )

  newActivities.forEach((activity) => store.set(addActivityAtom, activity))
}

export async function duplicatePreviousWeek(
  store: JotaiStore,
  currentWeekDays: string[],
  previousWeekDays: string[]
): Promise<void> {
  const allPrev: Array<{ activity: Activity; dayIndex: number }> = []

  previousWeekDays.forEach((day, index) => {
    store.get(dayActivitiesAtom(day)).forEach((activity) => {
      allPrev.push({ activity, dayIndex: index })
    })
  })

  if (allPrev.length === 0) return

  const now = new Date().toISOString()
  const newActivities: Activity[] = allPrev.map(({ activity, dayIndex }) => ({
    ...activity,
    id: crypto.randomUUID(),
    day: currentWeekDays[dayIndex],
    status: 'planned' as const,
    createdAt: now,
  }))

  await dbInsertActivities(
    newActivities.map((a) => ({
      id: a.id,
      userId: a.userId,
      day: a.day,
      title: a.title,
      startMin: a.startMin,
      durationMin: a.durationMin,
      categoryId: a.categoryId || null,
      status: a.status,
    }))
  )

  newActivities.forEach((activity) => store.set(addActivityAtom, activity))
}
