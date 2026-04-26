import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createRef } from 'react'
import { ActivityBlock } from '@/components/calendar/ActivityBlock'
import type { Activity } from '@/atoms/calendar'
import { createStore } from 'jotai'

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1',
    userId: 'user-1',
    day: '2024-01-15',
    title: 'Morning Run',
    startMin: 480, // 08:00
    durationMin: 60,
    categoryId: 'cat-health',
    status: 'planned',
    createdAt: '2024-01-15T08:00:00Z',
    ...overrides,
  }
}

// ----------------------------------------------------------------
// Mock hooks
// ----------------------------------------------------------------

const mockHandlePointerDown = vi.fn()
const mockHandleResizePointerDown = vi.fn()

vi.mock('@/hooks/useDragActivity', () => ({
  useDragActivity: () => ({
    isDragging: false,
    handlePointerDown: mockHandlePointerDown,
  }),
}))

vi.mock('@/hooks/useResizeActivity', () => ({
  useResizeActivity: () => ({
    handleResizePointerDown: mockHandleResizePointerDown,
  }),
}))

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe('ActivityBlock', () => {
  let columnRef: React.RefObject<HTMLDivElement>
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    vi.clearAllMocks()
    columnRef = createRef<HTMLDivElement>()
    store = createStore()
  })

  it('renders the activity title', () => {
    render(
      <ActivityBlock
        activity={makeActivity()}
        columnRef={columnRef}
        store={store}
      />
    )
    expect(screen.getByText('Morning Run')).toBeInTheDocument()
  })

  it('applies category color as background via data attribute or style', () => {
    const { container } = render(
      <ActivityBlock
        activity={makeActivity({ categoryId: 'cat-work' })}
        columnRef={columnRef}
        store={store}
        categoryColor="#3b82f6"
      />
    )
    const block = container.firstChild as HTMLElement
    // jsdom normalizes hex to rgb(); check via getComputedStyle or data attribute
    // The component sets backgroundColor via inline style
    const style = block?.getAttribute('style') ?? ''
    const hasColor =
      style.includes('#3b82f6') ||
      style.includes('rgb(59, 130, 246)') ||
      block?.getAttribute('data-category-color') === '#3b82f6'
    expect(hasColor).toBe(true)
  })

  it('calls handlePointerDown when pointerdown fires on the block', () => {
    const { container } = render(
      <ActivityBlock
        activity={makeActivity()}
        columnRef={columnRef}
        store={store}
      />
    )
    const block = container.firstChild as HTMLElement
    fireEvent.pointerDown(block)
    expect(mockHandlePointerDown).toHaveBeenCalledOnce()
  })

  it('renders a resize handle at the bottom', () => {
    render(
      <ActivityBlock
        activity={makeActivity()}
        columnRef={columnRef}
        store={store}
      />
    )
    const resizeHandle = document.querySelector('[data-resize-handle]')
    expect(resizeHandle).toBeInTheDocument()
  })

  it('calls handleResizePointerDown when pointerdown fires on resize handle', () => {
    render(
      <ActivityBlock
        activity={makeActivity()}
        columnRef={columnRef}
        store={store}
      />
    )
    const resizeHandle = document.querySelector('[data-resize-handle]') as HTMLElement
    fireEvent.pointerDown(resizeHandle)
    expect(mockHandleResizePointerDown).toHaveBeenCalledOnce()
  })

  it('applies "dragging" visual class when isDragging is true', async () => {
    vi.resetModules()

    // Override mock to return isDragging: true
    vi.doMock('@/hooks/useDragActivity', () => ({
      useDragActivity: () => ({
        isDragging: true,
        handlePointerDown: vi.fn(),
      }),
    }))

    // Dynamic import after resetting
    const { ActivityBlock: DraggingBlock } = await import('@/components/calendar/ActivityBlock')

    const { container } = render(
      <DraggingBlock
        activity={makeActivity()}
        columnRef={columnRef}
        store={store}
      />
    )
    const block = container.firstChild as HTMLElement
    // When dragging, opacity or a class should indicate it
    expect(
      block?.classList.contains('opacity-50') ||
      block?.getAttribute('data-dragging') === 'true' ||
      block?.style?.opacity === '0.5'
    ).toBe(true)
  })
})
