'use client'

import { useMemo } from 'react'
import { createStore } from 'jotai'
import { Provider } from 'jotai'
import { WeekView } from '@/components/calendar/WeekView'
import { dayActivitiesAtom } from '@/atoms/calendar'
import { categoriesAtom } from '@/atoms/categories'
import type { Activity } from '@/atoms/calendar'
import type { Category } from '@/atoms/categories'

interface FinancesWeekData {
  salary: number
  payFrequency: string
  currency: string
  totalFixed: number
  weekVariable: number
}

interface WeekViewClientProps {
  weekDays: string[]
  initialActivities: Record<string, Activity[]>
  initialCategories: Category[]
  userId: string
  finances?: FinancesWeekData | null
}

function createSeededStore(
  weekDays: string[],
  initialActivities: Record<string, Activity[]>,
  initialCategories: Category[]
) {
  const store = createStore()
  for (const day of weekDays) {
    store.set(dayActivitiesAtom(day), initialActivities[day] ?? [])
  }
  store.set(categoriesAtom, initialCategories)
  return store
}

function getLocalTodayIso(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function WeekViewClient({
  weekDays,
  initialActivities,
  initialCategories,
  userId,
  finances,
}: WeekViewClientProps) {
  const todayIso = getLocalTodayIso()
  const store = useMemo(
    () => createSeededStore(weekDays, initialActivities, initialCategories),
    // Only recreate store when weekDays change (navigating to different week)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekDays.join(',')]
  )

  return (
    <Provider store={store}>
      <WeekView weekDays={weekDays} store={store} todayIso={todayIso} userId={userId} finances={finances} />
    </Provider>
  )
}
