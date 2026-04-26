import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CurrentTimeLine } from '@/components/calendar/CurrentTimeLine'
import { DAY_START_MIN, minutesToPx } from '@/lib/time'

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe('CurrentTimeLine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders when isToday is true', () => {
    // 10:00 AM = 600 min since midnight
    vi.setSystemTime(new Date('2024-01-15T10:00:00'))
    const { container } = render(<CurrentTimeLine isToday={true} />)
    const line = container.querySelector('[data-testid="current-time-line"]')
    expect(line).toBeInTheDocument()
  })

  it('does NOT render when isToday is false', () => {
    vi.setSystemTime(new Date('2024-01-15T10:00:00'))
    const { container } = render(<CurrentTimeLine isToday={false} />)
    const line = container.querySelector('[data-testid="current-time-line"]')
    expect(line).not.toBeInTheDocument()
  })

  it('positions the line at the correct px offset for current time', () => {
    // Mock current time to 10:00 = 600 min
    vi.setSystemTime(new Date('2024-01-15T10:00:00'))

    const { container } = render(<CurrentTimeLine isToday={true} />)
    const line = container.querySelector('[data-testid="current-time-line"]') as HTMLElement
    const expectedTop = minutesToPx(600 - DAY_START_MIN) // (600-360)*1.5 = 360px
    expect(expectedTop).toBe(360)
    expect(line?.style.top).toBe(`${expectedTop}px`)
  })

  it('clamps the line to 0px when current time is before DAY_START_MIN', () => {
    // 05:00 = 300 min — before DAY_START (06:00)
    vi.setSystemTime(new Date('2024-01-15T05:00:00'))

    const { container } = render(<CurrentTimeLine isToday={true} />)
    const line = container.querySelector('[data-testid="current-time-line"]') as HTMLElement
    // Should clamp to 0
    expect(line?.style.top).toBe('0px')
  })

  it('positions correctly at 06:00 (DAY_START_MIN) → top 0px', () => {
    vi.setSystemTime(new Date('2024-01-15T06:00:00'))

    const { container } = render(<CurrentTimeLine isToday={true} />)
    const line = container.querySelector('[data-testid="current-time-line"]') as HTMLElement
    expect(line?.style.top).toBe('0px')
  })
})
