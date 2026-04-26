'use client'

import { MonthView } from '@/components/calendar/MonthView'

interface MonthViewClientProps {
  monthId: string
  dayStats: Record<string, { plannedMin: number; completedMin: number }>
  todayIso: string
}

export function MonthViewClient({ monthId, dayStats, todayIso }: MonthViewClientProps) {
  return <MonthView monthId={monthId} dayStats={dayStats} todayIso={todayIso} />
}
