import { createStore } from 'jotai'
import {
  dayActivitiesAtom,
  addActivityAtom,
  removeActivityAtom,
  updateActivityAtom,
} from '@/atoms/calendar'
import type { Activity, ActivityStatus } from '@/atoms/calendar'
import {
  dbMoveActivity,
  dbResizeActivity,
  dbUpdateActivityStatus,
  dbCreateActivity,
  dbDeleteActivity,
  dbUpdateActivity,
} from './activities.db'

type JotaiStore = ReturnType<typeof createStore>

export async function moveActivity(
  store: JotaiStore,
  activityId: string,
  sourceDay: string,
  targetDay: string,
  newStartMin: number
): Promise<void> {
  const sourceSnapshot = store.get(dayActivitiesAtom(sourceDay))
  const targetSnapshot = store.get(dayActivitiesAtom(targetDay))
  const activity = sourceSnapshot.find((a) => a.id === activityId)!
  store.set(removeActivityAtom, { id: activityId, day: sourceDay })
  store.set(addActivityAtom, { ...activity, day: targetDay, startMin: newStartMin })
  try {
    await dbMoveActivity(activityId, targetDay, newStartMin)
  } catch {
    store.set(dayActivitiesAtom(sourceDay), sourceSnapshot)
    store.set(dayActivitiesAtom(targetDay), targetSnapshot)
    throw new Error('Failed to move activity')
  }
}

export async function resizeActivity(
  store: JotaiStore,
  activityId: string,
  day: string,
  newDurationMin: number
): Promise<void> {
  const snapshot = store.get(dayActivitiesAtom(day))
  const activity = snapshot.find((a) => a.id === activityId)!
  store.set(updateActivityAtom, { ...activity, durationMin: newDurationMin })
  try {
    await dbResizeActivity(activityId, newDurationMin)
  } catch {
    store.set(dayActivitiesAtom(day), snapshot)
    throw new Error('Failed to resize activity')
  }
}

export async function updateActivityStatus(
  store: JotaiStore,
  activityId: string,
  day: string,
  newStatus: ActivityStatus
): Promise<void> {
  const snapshot = store.get(dayActivitiesAtom(day))
  const activity = snapshot.find((a) => a.id === activityId)!
  store.set(updateActivityAtom, { ...activity, status: newStatus })
  try {
    await dbUpdateActivityStatus(activityId, newStatus)
  } catch {
    store.set(dayActivitiesAtom(day), snapshot)
    throw new Error('Failed to update activity status')
  }
}

export async function createActivity(
  store: JotaiStore,
  input: Omit<Activity, 'id' | 'createdAt'>
): Promise<Activity> {
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const newActivity: Activity = { ...input, id, createdAt }
  store.set(addActivityAtom, newActivity)
  try {
    await dbCreateActivity({
      id: newActivity.id,
      userId: newActivity.userId,
      day: newActivity.day,
      title: newActivity.title,
      startMin: newActivity.startMin,
      durationMin: newActivity.durationMin,
      categoryId: newActivity.categoryId ?? null,
      status: newActivity.status,
    })
  } catch {
    store.set(removeActivityAtom, { id, day: input.day })
    throw new Error('Failed to create activity')
  }
  return newActivity
}

export async function updateActivity(
  store: JotaiStore,
  activityId: string,
  day: string,
  updates: { title?: string; startMin?: number; durationMin?: number; categoryId?: string | null }
): Promise<void> {
  const snapshot = store.get(dayActivitiesAtom(day))
  const activity = snapshot.find((a) => a.id === activityId)
  if (!activity) return
  store.set(updateActivityAtom, { ...activity, ...updates })
  try {
    await dbUpdateActivity(activityId, updates)
  } catch {
    store.set(dayActivitiesAtom(day), snapshot)
    throw new Error('Failed to update activity')
  }
}

export async function deleteActivity(
  store: JotaiStore,
  activityId: string,
  day: string
): Promise<void> {
  const snapshot = store.get(dayActivitiesAtom(day))
  store.set(removeActivityAtom, { id: activityId, day })
  try {
    await dbDeleteActivity(activityId)
  } catch {
    store.set(dayActivitiesAtom(day), snapshot)
    throw new Error('Failed to delete activity')
  }
}
