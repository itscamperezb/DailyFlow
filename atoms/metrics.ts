import { atom } from 'jotai'
import { dayActivitiesAtom } from './calendar'

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface WeekMetrics {
  /** Total completed hours per category: { categoryId -> hours } */
  hoursByCategory: Record<string, number>
  /** Total planned hours per category (all statuses): { categoryId -> hours } */
  plannedHoursByCategory: Record<string, number>
  /** Per-day progress: completed minutes & planned (all-status) minutes */
  dailyProgress: Record<string, { completed: number; planned: number }>
  /** Ratio 0–1: total completed durationMin / total planned durationMin */
  weeklyPct: number
}

// ----------------------------------------------------------------
// weekMetricsAtom
//
// Accepts an array of 7 ISO date strings for the week being viewed.
// Returns a derived WeekMetrics object computed over all 7 dayAtoms.
// ----------------------------------------------------------------

export const weekMetricsAtom = (weekDays: string[]) =>
  atom<WeekMetrics>((get) => {
    const hoursByCategory: Record<string, number> = {}
    const plannedHoursByCategory: Record<string, number> = {}
    const dailyProgress: Record<string, { completed: number; planned: number }> = {}

    let totalCompleted = 0
    let totalPlanned = 0

    for (const day of weekDays) {
      const activities = get(dayActivitiesAtom(day))

      let dayCompleted = 0
      let dayPlanned = 0

      for (const activity of activities) {
        const catId = activity.categoryId
        dayPlanned += activity.durationMin

        // All activities count toward planned hours per category
        plannedHoursByCategory[catId] =
          (plannedHoursByCategory[catId] ?? 0) + activity.durationMin / 60

        if (activity.status === 'completed') {
          dayCompleted += activity.durationMin
          hoursByCategory[catId] =
            (hoursByCategory[catId] ?? 0) + activity.durationMin / 60
        }
      }

      dailyProgress[day] = { completed: dayCompleted, planned: dayPlanned }
      totalCompleted += dayCompleted
      totalPlanned += dayPlanned
    }

    const weeklyPct = totalPlanned === 0 ? 0 : totalCompleted / totalPlanned

    return { hoursByCategory, plannedHoursByCategory, dailyProgress, weeklyPct }
  })
