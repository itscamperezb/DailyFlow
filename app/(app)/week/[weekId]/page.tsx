import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase.server'
import { WeekViewClient } from './WeekViewClient'
import { dbGetUserFinances, dbGetFixedExpenses, dbGetVariableExpenses } from '@/actions/finances.db'
import type { Activity } from '@/atoms/calendar'
import type { Category } from '@/atoms/categories'

interface PageProps {
  params: Promise<{ weekId: string }>
}

/**
 * Parse an ISO week string like "2026-W17" into the 7 ISO date strings
 * for Monday through Sunday of that week.
 */
function weekIdToDays(weekId: string): string[] {
  // Format: "YYYY-Www"
  const match = weekId.match(/^(\d{4})-W(\d{2})$/)
  if (!match) return []

  const year = parseInt(match[1], 10)
  const week = parseInt(match[2], 10)

  // ISO week 1 = the week containing the first Thursday of the year
  // Jan 4 is always in week 1
  const jan4 = new Date(Date.UTC(year, 0, 4))
  // Monday of week 1
  const dayOfWeek = jan4.getUTCDay() || 7 // 1=Mon … 7=Sun
  const week1Monday = new Date(jan4)
  week1Monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1))

  // Start of requested week
  const weekStart = new Date(week1Monday)
  weekStart.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setUTCDate(weekStart.getUTCDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

export default async function WeekPage({ params }: PageProps) {
  const { weekId } = await params
  const weekDays = weekIdToDays(weekId)

  if (weekDays.length === 0) {
    redirect('/week/' + getCurrentWeekId())
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const startDate = weekDays[0]
  const endDate = weekDays[6]

  const [{ data: rows }, { data: catRows }, financeRow, fixedRows, varRows] = await Promise.all([
    supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id)
      .gte('day', startDate)
      .lte('day', endDate),
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id),
    dbGetUserFinances(user.id),
    dbGetFixedExpenses(user.id),
    dbGetVariableExpenses(user.id, startDate, endDate),
  ])

  // Group activities by day
  const initialActivities: Record<string, Activity[]> = {}
  for (const day of weekDays) {
    initialActivities[day] = []
  }
  for (const row of rows ?? []) {
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
    if (initialActivities[row.day]) {
      initialActivities[row.day].push(activity)
    }
  }

  // Map categories
  const initialCategories: Category[] = (catRows ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color,
    icon: row.icon ?? '',
    createdAt: row.created_at,
  }))

  // Build finances data for the sidebar widget
  const financesWeekData = financeRow
    ? {
        salary: financeRow.salary,
        payFrequency: financeRow.payFrequency,
        currency: financeRow.currency,
        totalFixed: (fixedRows ?? []).reduce((acc, r) => acc + r.monthlyAmount, 0),
        weekVariable: (varRows ?? []).reduce((acc, r) => acc + r.amount, 0),
      }
    : null

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      <WeekViewClient
        key={weekId}
        weekDays={weekDays}
        initialActivities={initialActivities}
        initialCategories={initialCategories}
        userId={user.id}
        finances={financesWeekData}
      />
    </main>
  )
}

function getCurrentWeekId(): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  // ISO week number
  const startOfYear = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = startOfYear.getUTCDay() || 7
  const week1Monday = new Date(startOfYear)
  week1Monday.setUTCDate(startOfYear.getUTCDate() - (dayOfWeek - 1))
  const diffMs = now.getTime() - week1Monday.getTime()
  const week = Math.ceil((diffMs / 86400000 + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}
