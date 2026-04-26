import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function fireKey(key: string, target: EventTarget = document) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true })
  Object.defineProperty(event, 'target', { value: target })
  document.dispatchEvent(event)
  return event
}

function makeElement(tagName: string): HTMLElement {
  return Object.assign(document.createElement(tagName), {})
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe('useKeyboardShortcuts', () => {
  let onPrevWeek: ReturnType<typeof vi.fn>
  let onNextWeek: ReturnType<typeof vi.fn>
  let onNewActivity: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onPrevWeek = vi.fn()
    onNextWeek = vi.fn()
    onNewActivity = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ----------------------------------------------------------------
  // 'n' key — new activity
  // ----------------------------------------------------------------

  it("'n' key calls onNewActivity when no input is focused", () => {
    renderHook(() =>
      useKeyboardShortcuts({ onPrevWeek, onNextWeek, onNewActivity })
    )

    fireKey('n')

    expect(onNewActivity).toHaveBeenCalledOnce()
  })

  it("'n' key does NOT call onNewActivity when focus is inside an <input>", () => {
    renderHook(() =>
      useKeyboardShortcuts({ onPrevWeek, onNextWeek, onNewActivity })
    )

    const input = makeElement('input')
    document.body.appendChild(input)
    input.focus()

    // Simulate the event with the input as target
    const event = new KeyboardEvent('keydown', { key: 'n', bubbles: true })
    Object.defineProperty(event, 'target', { value: input })
    document.dispatchEvent(event)

    expect(onNewActivity).not.toHaveBeenCalled()

    document.body.removeChild(input)
  })

  it("'n' key does NOT call onNewActivity when focus is inside a <textarea>", () => {
    renderHook(() =>
      useKeyboardShortcuts({ onPrevWeek, onNextWeek, onNewActivity })
    )

    const textarea = makeElement('textarea')
    document.body.appendChild(textarea)
    textarea.focus()

    const event = new KeyboardEvent('keydown', { key: 'n', bubbles: true })
    Object.defineProperty(event, 'target', { value: textarea })
    document.dispatchEvent(event)

    expect(onNewActivity).not.toHaveBeenCalled()

    document.body.removeChild(textarea)
  })

  // ----------------------------------------------------------------
  // ArrowLeft / ArrowRight — week navigation
  // ----------------------------------------------------------------

  it('ArrowLeft calls onPrevWeek', () => {
    renderHook(() =>
      useKeyboardShortcuts({ onPrevWeek, onNextWeek, onNewActivity })
    )

    fireKey('ArrowLeft')

    expect(onPrevWeek).toHaveBeenCalledOnce()
    expect(onNextWeek).not.toHaveBeenCalled()
  })

  it('ArrowRight calls onNextWeek', () => {
    renderHook(() =>
      useKeyboardShortcuts({ onPrevWeek, onNextWeek, onNewActivity })
    )

    fireKey('ArrowRight')

    expect(onNextWeek).toHaveBeenCalledOnce()
    expect(onPrevWeek).not.toHaveBeenCalled()
  })

  it('ArrowLeft fires even when an input is focused', () => {
    renderHook(() =>
      useKeyboardShortcuts({ onPrevWeek, onNextWeek, onNewActivity })
    )

    const input = makeElement('input')
    document.body.appendChild(input)
    input.focus()

    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
    Object.defineProperty(event, 'target', { value: input })
    document.dispatchEvent(event)

    expect(onPrevWeek).toHaveBeenCalledOnce()

    document.body.removeChild(input)
  })

  it('ArrowRight fires even when an input is focused', () => {
    renderHook(() =>
      useKeyboardShortcuts({ onPrevWeek, onNextWeek, onNewActivity })
    )

    const input = makeElement('input')
    document.body.appendChild(input)
    input.focus()

    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
    Object.defineProperty(event, 'target', { value: input })
    document.dispatchEvent(event)

    expect(onNextWeek).toHaveBeenCalledOnce()

    document.body.removeChild(input)
  })

  // ----------------------------------------------------------------
  // disabled flag
  // ----------------------------------------------------------------

  it('does not register any handler when disabled=true', () => {
    renderHook(() =>
      useKeyboardShortcuts({ onPrevWeek, onNextWeek, onNewActivity, disabled: true })
    )

    fireKey('n')
    fireKey('ArrowLeft')
    fireKey('ArrowRight')

    expect(onNewActivity).not.toHaveBeenCalled()
    expect(onPrevWeek).not.toHaveBeenCalled()
    expect(onNextWeek).not.toHaveBeenCalled()
  })
})
