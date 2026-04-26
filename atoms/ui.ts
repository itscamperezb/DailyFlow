import { atom } from 'jotai'

// ----------------------------------------------------------------
// themeAtom
// ----------------------------------------------------------------

export type Theme = 'light' | 'dark' | 'system'

const THEME_KEY = 'dfp-theme'
const VALID_THEMES: Theme[] = ['light', 'dark', 'system']

/** Persist theme choice to localStorage */
export function persistTheme(theme: Theme): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(THEME_KEY, theme)
  }
}

/** Load persisted theme from localStorage. Falls back to 'system'. */
export function loadPersistedTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'system'
  const stored = localStorage.getItem(THEME_KEY)
  if (stored && VALID_THEMES.includes(stored as Theme)) {
    return stored as Theme
  }
  return 'system'
}

export const themeAtom = atom<Theme>('system')

// ----------------------------------------------------------------
// dragStateAtom
// ----------------------------------------------------------------

export interface DragState {
  activityId: string
  sourceDay: string
}

export const dragStateAtom = atom<DragState | null>(null)
