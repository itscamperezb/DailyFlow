'use client'

import { MonthView } from '@/components/calendar/MonthView'

interface MonthFinances {
  salary: number
  currency: string
  totalFixed: number
  totalVariable: number
  totalExtra: number
}

interface MonthViewClientProps {
  monthId: string
  dayStats: Record<string, { plannedMin: number; completedMin: number }>
  todayIso: string
  monthFinances: MonthFinances | null
  monthLabel: string
}

export function MonthViewClient({ monthId, dayStats, todayIso, monthFinances, monthLabel }: MonthViewClientProps) {
  return (
    <MonthView
      monthId={monthId}
      dayStats={dayStats}
      todayIso={todayIso}
      monthFinances={monthFinances}
      monthLabel={monthLabel}
    />
  )
}
