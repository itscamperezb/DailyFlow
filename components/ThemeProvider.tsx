'use client'

import { useEffect } from 'react'
import { useAtom } from 'jotai'
import { themeAtom, persistTheme, loadPersistedTheme } from '@/atoms/ui'
import type { Theme } from '@/atoms/ui'

// ----------------------------------------------------------------
// ThemeProvider
// ----------------------------------------------------------------

/**
 * Reads themeAtom, applies `dark` class to <html>, and rehydrates
 * from localStorage on first mount.
 *
 * Must be rendered inside a Jotai <Provider>.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useAtom(themeAtom)

  // Rehydrate from localStorage on mount (client-only)
  useEffect(() => {
    const persisted = loadPersistedTheme()
    if (persisted !== theme) {
      setTheme(persisted)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply dark class to <html> whenever theme changes
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      // system — follow OS preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }, [theme])

  return <>{children}</>
}

// ----------------------------------------------------------------
// ThemeToggle
// ----------------------------------------------------------------

const THEME_ORDER: Theme[] = ['light', 'dark', 'system']

const THEME_ICONS: Record<Theme, string> = {
  light: '☀️',
  dark: '🌙',
  system: '🖥️',
}

const THEME_LABELS: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

/**
 * Button that cycles through light → dark → system.
 * Persists choice to localStorage.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useAtom(themeAtom)

  function handleToggle() {
    const currentIdx = THEME_ORDER.indexOf(theme)
    const nextTheme = THEME_ORDER[(currentIdx + 1) % THEME_ORDER.length]
    setTheme(nextTheme)
    persistTheme(nextTheme)
  }

  return (
    <button
      data-testid="theme-toggle"
      onClick={handleToggle}
      className="flex items-center gap-1 px-2 py-1 rounded text-sm hover:bg-accent transition-colors"
      aria-label={`Current theme: ${THEME_LABELS[theme]}. Click to switch.`}
      title={`Theme: ${THEME_LABELS[theme]}`}
    >
      <span>{THEME_ICONS[theme]}</span>
      <span className="hidden sm:inline">{THEME_LABELS[theme]}</span>
    </button>
  )
}
