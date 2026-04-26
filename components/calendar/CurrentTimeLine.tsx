'use client'

import { useState, useEffect } from 'react'
import { DAY_START_MIN, minutesToPx } from '@/lib/time'

export interface CurrentTimeLineProps {
  isToday: boolean
}

function getCurrentTopPx(): number {
  const now = new Date()
  const currentMin = now.getHours() * 60 + now.getMinutes()
  const offsetMin = Math.max(currentMin - DAY_START_MIN, 0)
  return minutesToPx(offsetMin)
}

export function CurrentTimeLine({ isToday }: CurrentTimeLineProps) {
  const [topPx, setTopPx] = useState<number>(getCurrentTopPx)

  useEffect(() => {
    if (!isToday) return
    // Update every minute
    const interval = setInterval(() => {
      setTopPx(getCurrentTopPx())
    }, 60_000)
    return () => clearInterval(interval)
  }, [isToday])

  if (!isToday) return null

  return (
    <div
      data-testid="current-time-line"
      className="absolute left-0 right-0 h-0.5 bg-red-500 z-10 pointer-events-none"
      style={{ top: `${topPx}px` }}
    />
  )
}
