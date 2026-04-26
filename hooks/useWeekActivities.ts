'use client'

import { useEffect, useState } from 'react'
import { createStore } from 'jotai'
import { createClient } from '@/lib/supabase'
import { dayActivitiesAtom } from '@/atoms/calendar'
import type { Activity } from '@/atoms/calendar'

type JotaiStore = ReturnType<typeof createStore>

export interface UseWeekActivitiesOptions {
  weekDays: string[]   // 7 ISO date strings "YYYY-MM-DD"
  store: JotaiStore
  userId: string
}

export interface UseWeekActivitiesResult {
  isLoading: boolean
  error: string | null
}

/**
 * Fetches all activities for a given week range and seeds the Jotai atoms.
 * Cleans up on unmount.
 */
export function useWeekActivities({
  weekDays,
  store,
  userId,
}: UseWeekActivitiesOptions): UseWeekActivitiesResult {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId || weekDays.length === 0) {
      setIsLoading(false)
      return
    }

    const startDate = weekDays[0]
    const endDate = weekDays[weekDays.length - 1]

    const supabase = createClient()

    supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .gte('day', startDate)
      .lte('day', endDate)
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message)
          setIsLoading(false)
          return
        }

        // Group by day and seed atoms
        const byDay: Record<string, Activity[]> = {}
        for (const day of weekDays) {
          byDay[day] = []
        }

        for (const row of data ?? []) {
          const activity: Activity = {
            id: row.id,
            userId: row.user_id,
            day: row.day,
            title: row.title,
            startMin: row.start_min,
            durationMin: row.duration_min,
            categoryId: row.category_id ?? '',
            status: row.status,
            createdAt: row.created_at,
          }
          if (byDay[row.day]) {
            byDay[row.day].push(activity)
          }
        }

        for (const [day, acts] of Object.entries(byDay)) {
          store.set(dayActivitiesAtom(day), acts)
        }

        setIsLoading(false)
      })
  }, [weekDays.join(','), store, userId])  // eslint-disable-line react-hooks/exhaustive-deps

  return { isLoading, error }
}
