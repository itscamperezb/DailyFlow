'use client'

export interface DailyProgressProps {
  weekDays: string[]
  dailyProgress: Record<string, { completed: number; planned: number }>
}

const DAY_LABELS: Record<number, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
}

function getDayLabel(isoDate: string): string {
  // Parse as UTC to avoid timezone shifts
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return DAY_LABELS[date.getUTCDay()] ?? isoDate
}

function computePct(completed: number, planned: number): number {
  if (planned === 0) return 0
  return Math.min(100, Math.round((completed / planned) * 100))
}

/**
 * Displays a per-day progress bar row for each day in the week.
 */
export function DailyProgress({ weekDays, dailyProgress }: DailyProgressProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {weekDays.map((day) => {
        const { completed, planned } = dailyProgress[day] ?? { completed: 0, planned: 0 }
        const pct = computePct(completed, planned)

        return (
          <div key={day} data-testid="daily-progress-row" className="flex items-center gap-2">
            <span className="w-7 shrink-0 text-xs font-medium text-muted-foreground">
              {getDayLabel(day)}
            </span>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                data-testid="daily-progress-bar"
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-8 text-right text-xs text-muted-foreground">{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}
