import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WeekSummary } from '@/components/sidebar/WeekSummary'

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe('WeekSummary', () => {
  it('displays the weekly completion percentage', () => {
    render(
      <WeekSummary
        weeklyPct={0.75}
        totalPlannedHours={8}
        totalCompletedHours={6}
      />
    )
    // 0.75 → 75%
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('displays 0% when nothing is completed', () => {
    render(
      <WeekSummary
        weeklyPct={0}
        totalPlannedHours={10}
        totalCompletedHours={0}
      />
    )
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('displays 100% when all activities are completed', () => {
    render(
      <WeekSummary
        weeklyPct={1}
        totalPlannedHours={5}
        totalCompletedHours={5}
      />
    )
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('shows total planned hours', () => {
    render(
      <WeekSummary
        weeklyPct={0.5}
        totalPlannedHours={12}
        totalCompletedHours={6}
      />
    )
    expect(screen.getByText(/12h/)).toBeInTheDocument()
  })

  it('shows total completed hours', () => {
    render(
      <WeekSummary
        weeklyPct={0.5}
        totalPlannedHours={12}
        totalCompletedHours={6}
      />
    )
    expect(screen.getByText(/6h/)).toBeInTheDocument()
  })

  it('rounds weeklyPct to the nearest integer percentage', () => {
    render(
      <WeekSummary
        weeklyPct={0.333}
        totalPlannedHours={9}
        totalCompletedHours={3}
      />
    )
    // 0.333 → 33%
    expect(screen.getByText('33%')).toBeInTheDocument()
  })

  it('renders a Card container', () => {
    const { container } = render(
      <WeekSummary
        weeklyPct={0.5}
        totalPlannedHours={8}
        totalCompletedHours={4}
      />
    )
    expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument()
  })
})
