'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface WeekSummaryProps {
  weeklyPct: number          // 0–1
  totalPlannedHours: number
  totalCompletedHours: number
}

/**
 * Card showing the weekly completion percentage plus hour totals.
 */
export function WeekSummary({ weeklyPct, totalPlannedHours, totalCompletedHours }: WeekSummaryProps) {
  const pct = Math.round(weeklyPct * 100)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Esta semana</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold">{pct}%</span>
          <span className="text-sm text-muted-foreground">completado</span>
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{totalCompletedHours}h</span> completadas
          </span>
          <span>
            <span className="font-medium text-foreground">{totalPlannedHours}h</span> planificadas
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
