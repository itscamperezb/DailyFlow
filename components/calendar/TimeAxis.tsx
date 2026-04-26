'use client'

import { DAY_START_MIN, DAY_END_MIN, minutesToPx, minToTime } from '@/lib/time'

const TOTAL_HEIGHT_PX = minutesToPx(DAY_END_MIN - DAY_START_MIN)

export function TimeAxis() {
  const labels: { time: string; topPx: number }[] = []

  for (let min = DAY_START_MIN; min <= DAY_END_MIN; min += 60) {
    const label = min === 1440 ? '24:00' : minToTime(min)
    labels.push({
      time: label,
      topPx: minutesToPx(min - DAY_START_MIN),
    })
  }

  return (
    <div
      className="relative w-[60px] flex-shrink-0 select-none"
      style={{ height: TOTAL_HEIGHT_PX }}
    >
      {labels.map(({ time, topPx }) => (
        <div
          key={time}
          className="absolute right-2 flex items-center"
          style={{ top: `${topPx}px` }}
        >
          <span className="text-xs text-muted-foreground leading-none">{time}</span>
        </div>
      ))}
    </div>
  )
}
