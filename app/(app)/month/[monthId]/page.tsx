import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase.server'
import { MonthViewClient } from './MonthViewClient'

interface PageProps {
  params: Promise<{ monthId: string }>
}

function getCurrentMonthId(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export default async function MonthPage({ params }: PageProps) {
  const { monthId } = await params

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthId)) {
    redirect('/month/' + getCurrentMonthId())
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [year, month] = monthId.split('-').map(Number)
  const firstDay = `${monthId}-01`
  const lastDayDate = new Date(Date.UTC(year, month, 0))
  const lastDay = lastDayDate.toISOString().slice(0, 10)

  const { data: rows } = await supabase
    .from('activities')
    .select('day, status, duration_min')
    .eq('user_id', user.id)
    .gte('day', firstDay)
    .lte('day', lastDay)

  const dayStats: Record<string, { plannedMin: number; completedMin: number }> = {}

  for (const row of rows ?? []) {
    if (!dayStats[row.day]) {
      dayStats[row.day] = { plannedMin: 0, completedMin: 0 }
    }
    dayStats[row.day].plannedMin += row.duration_min ?? 0
    if (row.status === 'completed') {
      dayStats[row.day].completedMin += row.duration_min ?? 0
    }
  }

  const todayIso = new Date().toISOString().slice(0, 10)

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      <MonthViewClient monthId={monthId} dayStats={dayStats} todayIso={todayIso} />
    </main>
  )
}
