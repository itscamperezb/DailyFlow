import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CategoryChartInner } from '@/components/sidebar/CategoryChartInner'
import type { Category } from '@/atoms/categories'

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

const CATEGORIES: Category[] = [
  { id: 'cat-work', userId: 'u1', name: 'Work', color: '#3b82f6', icon: '💼', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'cat-health', userId: 'u1', name: 'Health', color: '#22c55e', icon: '🏃', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'cat-learn', userId: 'u1', name: 'Learning', color: '#f59e0b', icon: '📚', createdAt: '2024-01-01T00:00:00Z' },
]

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe('CategoryChartInner', () => {
  it('renders nothing (empty state) when hoursByCategory is empty', () => {
    const { container } = render(
      <CategoryChartInner
        hoursByCategory={{}}
        categories={CATEGORIES}
      />
    )
    // No bar items rendered
    const bars = container.querySelectorAll('[data-testid="category-bar"]')
    expect(bars).toHaveLength(0)
  })

  it('renders nothing when no activities have been completed', () => {
    const { container } = render(
      <CategoryChartInner
        hoursByCategory={{}}
        categories={CATEGORIES}
      />
    )
    expect(container.querySelectorAll('[data-testid="category-bar"]')).toHaveLength(0)
  })

  it('renders one bar per category that has completed hours', () => {
    const { container } = render(
      <CategoryChartInner
        hoursByCategory={{ 'cat-work': 3, 'cat-health': 1.5 }}
        categories={CATEGORIES}
      />
    )
    const bars = container.querySelectorAll('[data-testid="category-bar"]')
    expect(bars).toHaveLength(2)
  })

  it('displays the category name for each bar', () => {
    render(
      <CategoryChartInner
        hoursByCategory={{ 'cat-work': 2, 'cat-learn': 0.5 }}
        categories={CATEGORIES}
      />
    )
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('Learning')).toBeInTheDocument()
  })

  it('displays hours value for each bar', () => {
    render(
      <CategoryChartInner
        hoursByCategory={{ 'cat-work': 3, 'cat-health': 1.5 }}
        categories={CATEGORIES}
      />
    )
    expect(screen.getByText(/3(\.\d+)?h/)).toBeInTheDocument()
    expect(screen.getByText(/1\.5h/)).toBeInTheDocument()
  })

  it('sets bar width proportional to max value', () => {
    const { container } = render(
      <CategoryChartInner
        hoursByCategory={{ 'cat-work': 4, 'cat-health': 2 }}
        categories={CATEGORIES}
      />
    )
    const bars = container.querySelectorAll<HTMLElement>('[data-testid="category-bar-fill"]')
    expect(bars).toHaveLength(2)
    // work: 4/4 = 100%, health: 2/4 = 50%
    const workBar = bars[0]
    const healthBar = bars[1]
    expect(workBar.style.width).toBe('100%')
    expect(healthBar.style.width).toBe('50%')
  })

  it('applies the category color to the bar fill', () => {
    const { container } = render(
      <CategoryChartInner
        hoursByCategory={{ 'cat-work': 2 }}
        categories={CATEGORIES}
      />
    )
    const fill = container.querySelector<HTMLElement>('[data-testid="category-bar-fill"]')
    expect(fill).not.toBeNull()
    // Color comes from inline style backgroundColor
    const style = fill!.getAttribute('style') ?? ''
    expect(style).toMatch(/#3b82f6|rgb\(59,\s*130,\s*246\)/)
  })

  it('skips categories with zero hours (not in hoursByCategory)', () => {
    const { container } = render(
      <CategoryChartInner
        hoursByCategory={{ 'cat-work': 5 }}
        categories={CATEGORIES}
      />
    )
    const bars = container.querySelectorAll('[data-testid="category-bar"]')
    // Only work category is shown
    expect(bars).toHaveLength(1)
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.queryByText('Health')).not.toBeInTheDocument()
  })
})
