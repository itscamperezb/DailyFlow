import { atom } from 'jotai'
import { atomFamily } from 'jotai-family'

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export type ActivityStatus = 'planned' | 'in_progress' | 'completed' | 'skipped'

export interface Activity {
  id: string
  userId: string
  day: string          // ISO date "YYYY-MM-DD"
  title: string
  startMin: number     // minutes since midnight
  durationMin: number
  categoryId: string
  status: ActivityStatus
  createdAt: string
}

// ----------------------------------------------------------------
// dayActivitiesAtom — key: ISO date string "YYYY-MM-DD"
// ----------------------------------------------------------------

export const dayActivitiesAtom = atomFamily((_day: string) => atom<Activity[]>([]))

// ----------------------------------------------------------------
// Action atoms (write-only)
// ----------------------------------------------------------------

export const addActivityAtom = atom(
  null,
  (_get, set, activity: Activity) => {
    set(dayActivitiesAtom(activity.day), (prev) => [...prev, activity])
  }
)

export const updateActivityAtom = atom(
  null,
  (_get, set, activity: Activity) => {
    set(dayActivitiesAtom(activity.day), (prev) =>
      prev.map((a) => (a.id === activity.id ? activity : a))
    )
  }
)

export const removeActivityAtom = atom(
  null,
  (_get, set, { id, day }: { id: string; day: string }) => {
    set(dayActivitiesAtom(day), (prev) => prev.filter((a) => a.id !== id))
  }
)
