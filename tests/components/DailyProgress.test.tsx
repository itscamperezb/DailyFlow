import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DailyProgress } from '@/components/sidebar/DailyProgress'

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

const WEEK_DAYS = [
  '2024-01-15', // Mon
  '2024-01-16', // Tue
  '2024-01-17', // Wed
  '2024-01-18', // Thu
  '2024-01-19', // Fri
  '2024-01-20', // Sat
  '2024-01-21', // Sun
]

function makeProgress(overrides: Record<string, { completed: number; planned: number }> = {}) {
  const base: Record<string, { completed: number; planned: number }> = {}
  WEEK_DAYS.forEach((d) => {
    base[d] = { completed: 0, planned: 0 }
  })
  return { ...base, ...overrides }
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe('DailyProgress', () => {
  it('renders a row for each day of the week', () => {
    const { container } = render(
      <DailyProgress
        weekDays={WEEK_DAYS}
        dailyProgress={makeProgress()}
      />
    )
    const rows = container.querySelectorAll('[data-testid="daily-progress-row"]')
    expect(rows).toHaveLength(7)
  })

  it('shows 0% when planned minutes is 0', () => {
    render(
      <DailyProgress
        weekDays={WEEK_DAYS}
        dailyProgress={makeProgress()}
      />
    )
    const percentages = screen.getAllByText('0%')
    expect(percentages.length).toBeGreaterThanOrEqual(7)
  })

  it('shows correct percentage when completed equals planned', () => {
    render(
      <DailyProgress
        weekDays={WEEK_DAYS}
        dailyProgress={makeProgress({
          '2024-01-15': { completed: 60, planned: 60 },
        })}
      />
    )
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('shows rounded percentage for partial completion', () => {
    render(
      <DailyProgress
        weekDays={WEEK_DAYS}
        dailyProgress={makeProgress({
          '2024-01-15': { completed: 30, planned: 90 },
        })}
      />
    )
    // 30/90 = 33.33% → Math.round = 33%
    expect(screen.getByText('33%')).toBeInTheDocument()
  })

  it('shows 50% when half the planned minutes are completed', () => {
    render(
      <DailyProgress
        weekDays={WEEK_DAYS}
        dailyProgress={makeProgress({
          '2024-01-16': { completed: 60, planned: 120 },
        })}
      />
    )
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('sets progress bar width to the correct percentage', () => {
    const { container } = render(
      <DailyProgress
        weekDays={WEEK_DAYS}
        dailyProgress={makeProgress({
          '2024-01-15': { completed: 60, planned: 120 },
        })}
      />
    )
    const bars = container.querySelectorAll<HTMLElement>('[data-testid="daily-progress-bar"]')
    expect(bars).toHaveLength(7)
    // Monday bar should be 50%
    const mondayBar = bars[0]
    expect(mondayBar.style.width).toBe('50%')
  })

  it('shows abbreviated day labels (Mon, Tue, Wed...)', () => {
    render(
      <DailyProgress
        weekDays={WEEK_DAYS}
        dailyProgress={makeProgress()}
      />
    )
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Tue')).toBeInTheDocument()
    expect(screen.getByText('Wed')).toBeInTheDocument()
    expect(screen.getByText('Thu')).toBeInTheDocument()
    expect(screen.getByText('Fri')).toBeInTheDocument()
    expect(screen.getByText('Sat')).toBeInTheDocument()
    expect(screen.getByText('Sun')).toBeInTheDocument()
  })

  it('clamps bar width to 100% when completed exceeds planned', () => {
    const { container } = render(
      <DailyProgress
        weekDays={WEEK_DAYS}
        dailyProgress={makeProgress({
          '2024-01-15': { completed: 120, planned: 60 },
        })}
      />
    )
    const bars = container.querySelectorAll<HTMLElement>('[data-testid="daily-progress-bar"]')
    expect(bars[0].style.width).toBe('100%')
  })
})
