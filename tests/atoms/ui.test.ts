import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ----------------------------------------------------------------
// themeAtom + localStorage persistence
// ----------------------------------------------------------------

describe('themeAtom', () => {
  // We stub localStorage before each test
  let localStorageStore: Record<string, string> = {}

  const localStorageMock = {
    getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value }),
    removeItem: vi.fn((key: string) => { delete localStorageStore[key] }),
    clear: vi.fn(() => { localStorageStore = {} }),
  }

  beforeEach(() => {
    localStorageStore = {}
    vi.resetModules()
    vi.stubGlobal('localStorage', localStorageMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('themeAtom defaults to "system" when localStorage is empty', async () => {
    const { themeAtom } = await import('@/atoms/ui')
    const { createStore } = await import('jotai')

    const store = createStore()
    expect(store.get(themeAtom)).toBe('system')
  })

  it('themeAtom can be set to "light"', async () => {
    const { themeAtom } = await import('@/atoms/ui')
    const { createStore } = await import('jotai')

    const store = createStore()
    store.set(themeAtom, 'light')
    expect(store.get(themeAtom)).toBe('light')
  })

  it('themeAtom can be set to "dark"', async () => {
    const { themeAtom } = await import('@/atoms/ui')
    const { createStore } = await import('jotai')

    const store = createStore()
    store.set(themeAtom, 'dark')
    expect(store.get(themeAtom)).toBe('dark')
  })

  it('themeAtom cycles correctly: light → dark → system', async () => {
    const { themeAtom } = await import('@/atoms/ui')
    const { createStore } = await import('jotai')
    type Theme = 'light' | 'dark' | 'system'

    function cycleTheme(current: Theme): Theme {
      if (current === 'light') return 'dark'
      if (current === 'dark') return 'system'
      return 'light'
    }

    const store = createStore()
    store.set(themeAtom, 'light')
    expect(store.get(themeAtom)).toBe('light')

    store.set(themeAtom, cycleTheme(store.get(themeAtom)))
    expect(store.get(themeAtom)).toBe('dark')

    store.set(themeAtom, cycleTheme(store.get(themeAtom)))
    expect(store.get(themeAtom)).toBe('system')

    store.set(themeAtom, cycleTheme(store.get(themeAtom)))
    expect(store.get(themeAtom)).toBe('light')
  })
})

// ----------------------------------------------------------------
// persistTheme utility
// ----------------------------------------------------------------

describe('persistTheme', () => {
  let localStorageStore: Record<string, string> = {}

  const localStorageMock = {
    getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value }),
    removeItem: vi.fn((key: string) => { delete localStorageStore[key] }),
    clear: vi.fn(() => { localStorageStore = {} }),
  }

  beforeEach(() => {
    localStorageStore = {}
    vi.resetModules()
    vi.stubGlobal('localStorage', localStorageMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('persistTheme writes to localStorage with key "dfp-theme"', async () => {
    const { persistTheme } = await import('@/atoms/ui')
    persistTheme('dark')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('dfp-theme', 'dark')
  })

  it('persistTheme("light") saves "light"', async () => {
    const { persistTheme } = await import('@/atoms/ui')
    persistTheme('light')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('dfp-theme', 'light')
  })

  it('persistTheme("system") saves "system"', async () => {
    const { persistTheme } = await import('@/atoms/ui')
    persistTheme('system')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('dfp-theme', 'system')
  })

  it('loadPersistedTheme returns stored value when key exists', async () => {
    localStorageStore['dfp-theme'] = 'dark'
    const { loadPersistedTheme } = await import('@/atoms/ui')
    expect(loadPersistedTheme()).toBe('dark')
  })

  it('loadPersistedTheme returns "system" when key is absent', async () => {
    const { loadPersistedTheme } = await import('@/atoms/ui')
    expect(loadPersistedTheme()).toBe('system')
  })

  it('loadPersistedTheme returns "system" for unknown stored values', async () => {
    localStorageStore['dfp-theme'] = 'bogus-value'
    const { loadPersistedTheme } = await import('@/atoms/ui')
    expect(loadPersistedTheme()).toBe('system')
  })
})
