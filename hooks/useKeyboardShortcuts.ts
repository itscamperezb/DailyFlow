'use client'

import { useEffect } from 'react'

export interface UseKeyboardShortcutsOptions {
  onPrevWeek: () => void
  onNextWeek: () => void
  onNewActivity: () => void
  /** Set to true to disable all shortcuts (e.g. when a dialog is open) */
  disabled?: boolean
}

/**
 * Registers global keyboard shortcuts:
 *  - ArrowLeft  → previous week
 *  - ArrowRight → next week
 *  - n          → open new-activity form (only when not focused on an input/textarea/select)
 */
export function useKeyboardShortcuts({
  onPrevWeek,
  onNextWeek,
  onNewActivity,
  disabled = false,
}: UseKeyboardShortcutsOptions): void {
  useEffect(() => {
    if (disabled) return

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable

      switch (event.key) {
        case 'ArrowLeft':
          onPrevWeek()
          break
        case 'ArrowRight':
          onNextWeek()
          break
        case 'n':
        case 'N':
          if (!isInputFocused) {
            event.preventDefault()
            onNewActivity()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onPrevWeek, onNextWeek, onNewActivity, disabled])
}
