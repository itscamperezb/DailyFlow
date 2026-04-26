/**
 * Integration test: apply template to an empty week
 *
 * Uses a real Jotai store. DB layer (Drizzle) is mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mock DB BEFORE imports ---
vi.mock('@/lib/drizzle/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}))

import { createStore } from 'jotai'
import { db } from '@/lib/drizzle/client'
import { dayActivitiesAtom } from '@/atoms/calendar'
import { applyTemplate } from '@/actions/templates'

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

const TEMPLATE_ID = 'tpl-1'

const WEEK = [
  '2024-03-11', // Mon (index 0)
  '2024-03-12', // Tue (index 1)
  '2024-03-13', // Wed (index 2)
  '2024-03-14', // Thu (index 3)
  '2024-03-15', // Fri (index 4)
  '2024-03-16', // Sat (index 5)
  '2024-03-17', // Sun (index 6)
]

const TEMPLATE_ACTIVITIES = [
  { id: 'ta-1', templateId: TEMPLATE_ID, dayOfWeek: 0, title: 'Morning Run', startMin: 360, durationMin: 60, categoryId: 'cat-health' },
  { id: 'ta-2', templateId: TEMPLATE_ID, dayOfWeek: 0, title: 'Breakfast', startMin: 480, durationMin: 30, categoryId: null },
  { id: 'ta-3', templateId: TEMPLATE_ID, dayOfWeek: 2, title: 'Yoga', startMin: 420, durationMin: 45, categoryId: 'cat-wellness' },
  { id: 'ta-4', templateId: TEMPLATE_ID, dayOfWeek: 4, title: 'Deep Work', startMin: 540, durationMin: 120, categoryId: 'cat-work' },
]

// Build select chain: db.select().from().where() → resolves with rows
function buildSelectChain(rows: unknown[]) {
  const whereFn = vi.fn().mockResolvedValue(rows)
  const fromFn = vi.fn().mockReturnValue({ where: whereFn })
  const selectFn = vi.fn().mockReturnValue({ from: fromFn })
  return { selectFn, fromFn, whereFn }
}

function freshStore() {
  WEEK.forEach((d) => dayActivitiesAtom.remove(d))
  return createStore()
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe('applyTemplate integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates activities with status=planned for every template_activity', async () => {
    const { selectFn } = buildSelectChain(TEMPLATE_ACTIVITIES)
    vi.mocked(db).select = selectFn as unknown as typeof db.select

    const insertValues = vi.fn().mockResolvedValue([])
    vi.mocked(db).insert = vi.fn().mockReturnValue({ values: insertValues })

    const store = freshStore()

    await applyTemplate(store, TEMPLATE_ID, WEEK)

    const rows = insertValues.mock.calls[0][0] as Array<Record<string, unknown>>
    expect(rows).toHaveLength(4)
    expect(rows.every((r) => r.status === 'planned')).toBe(true)
  })

  it('seeds dayActivitiesAtom for each mapped day', async () => {
    const { selectFn } = buildSelectChain(TEMPLATE_ACTIVITIES)
    vi.mocked(db).select = selectFn as unknown as typeof db.select
    vi.mocked(db).insert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) })

    const store = freshStore()

    await applyTemplate(store, TEMPLATE_ID, WEEK)

    // Monday (index 0) should have 2 activities
    const monday = store.get(dayActivitiesAtom(WEEK[0]))
    expect(monday).toHaveLength(2)
    expect(monday.every((a) => a.status === 'planned')).toBe(true)
    expect(monday.map((a) => a.title).sort()).toEqual(['Breakfast', 'Morning Run'])

    // Wednesday (index 2) should have 1 activity
    const wednesday = store.get(dayActivitiesAtom(WEEK[2]))
    expect(wednesday).toHaveLength(1)
    expect(wednesday[0].title).toBe('Yoga')
    expect(wednesday[0].status).toBe('planned')

    // Friday (index 4) should have 1 activity
    const friday = store.get(dayActivitiesAtom(WEEK[4]))
    expect(friday).toHaveLength(1)
    expect(friday[0].title).toBe('Deep Work')

    // Other days should be empty
    expect(store.get(dayActivitiesAtom(WEEK[1]))).toHaveLength(0)
    expect(store.get(dayActivitiesAtom(WEEK[3]))).toHaveLength(0)
    expect(store.get(dayActivitiesAtom(WEEK[5]))).toHaveLength(0)
    expect(store.get(dayActivitiesAtom(WEEK[6]))).toHaveLength(0)
  })

  it('gives each created activity a unique id (not the template_activity id)', async () => {
    const { selectFn } = buildSelectChain(TEMPLATE_ACTIVITIES)
    vi.mocked(db).select = selectFn as unknown as typeof db.select
    vi.mocked(db).insert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) })

    const store = freshStore()

    await applyTemplate(store, TEMPLATE_ID, WEEK)

    const allActivities = WEEK.flatMap((day) => store.get(dayActivitiesAtom(day)))
    const ids = allActivities.map((a) => a.id)
    const templateIds = TEMPLATE_ACTIVITIES.map((ta) => ta.id)

    // No created activity should use a template_activity id
    ids.forEach((id) => {
      expect(templateIds).not.toContain(id)
    })

    // All ids should be unique
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('does nothing when template has no activities', async () => {
    const { selectFn } = buildSelectChain([])
    vi.mocked(db).select = selectFn as unknown as typeof db.select

    const store = freshStore()

    await applyTemplate(store, TEMPLATE_ID, WEEK)

    // insert never called
    expect(vi.mocked(db).insert).not.toHaveBeenCalled()

    // All atoms empty
    WEEK.forEach((day) => {
      expect(store.get(dayActivitiesAtom(day))).toHaveLength(0)
    })
  })
})
