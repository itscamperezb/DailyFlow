import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimeAxis } from '@/components/calendar/TimeAxis'
import { DAY_START_MIN, DAY_END_MIN, minutesToPx } from '@/lib/time'

describe('TimeAxis', () => {
  it('renders hour labels from 06:00 to 24:00', () => {
    render(<TimeAxis />)

    // First label: 06:00
    expect(screen.getByText('06:00')).toBeInTheDocument()
    // Last rendered label: 24:00 (midnight)
    expect(screen.getByText('24:00')).toBeInTheDocument()
    // Mid-day check
    expect(screen.getByText('12:00')).toBeInTheDocument()
  })

  it('renders exactly 19 labels (06:00 through 24:00 inclusive)', () => {
    render(<TimeAxis />)
    // 06:00, 07:00, ..., 24:00 → 19 labels
    const totalLabels = (DAY_END_MIN - DAY_START_MIN) / 60 + 1
    expect(totalLabels).toBe(19)
    expect(screen.getAllByText(/^\d{2}:00$/).length).toBe(19)
  })

  it('positions the 07:00 label at the correct px offset from top', () => {
    const { container } = render(<TimeAxis />)
    // 07:00 is 60 min after DAY_START_MIN (360)
    // offset = minutesToPx(60) = 90px
    const expectedTop = minutesToPx(60)
    expect(expectedTop).toBe(90)

    // Find the 07:00 span element and check its parent's style
    const label = screen.getByText('07:00')
    const wrapper = label.closest('[style]') as HTMLElement
    expect(wrapper?.style.top).toBe(`${expectedTop}px`)
  })

  it('positions the 12:00 label at correct px offset', () => {
    render(<TimeAxis />)
    // 12:00 is 360 min after DAY_START_MIN (360)
    // offset = minutesToPx(360) = 540px
    const expectedTop = minutesToPx(360)
    expect(expectedTop).toBe(540)

    const label = screen.getByText('12:00')
    const wrapper = label.closest('[style]') as HTMLElement
    expect(wrapper?.style.top).toBe(`${expectedTop}px`)
  })

  it('positions the 06:00 label at top: 0px', () => {
    render(<TimeAxis />)
    const label = screen.getByText('06:00')
    const wrapper = label.closest('[style]') as HTMLElement
    expect(wrapper?.style.top).toBe('0px')
  })
})
