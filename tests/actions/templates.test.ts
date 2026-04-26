import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks BEFORE imports ---

vi.mock('@/lib/drizzle/client', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    delete: vi.fn(),
  },
}))

import { createStore } from 'jotai'
import { db } from '@/lib/drizzle/client'
import { dayActivitiesAtom, addActivityAtom } from '@/atoms/calendar'
import type { Activity } from '@/atoms/calendar'
import { saveTemplate, applyTemplate, duplicatePreviousWeek } from '@/actions/templates'

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

const USER_ID = 'user-1'
const TEMPLATE_ID = 'tpl-1'

// Week A = current week (Mon–Sun)
const WEEK_A = [
  '2024-01-15', // Mon
  '2024-01-16', // Tue
  '2024-01-17', // Wed
  '2024-01-18', // Thu
  '2024-01-19', // Fri
  '2024-01-20', // Sat
  '2024-01-21', // Sun
]

// Week B = previous week
const WEEK_B = [
  '2024-01-08', // Mon
  '2024-01-09', // Tue
  '2024-01-10', // Wed
  '2024-01-11', // Thu
  '2024-01-12', // Fri
  '2024-01-13', // Sat
  '2024-01-14', // Sun
]

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1',
    userId: USER_ID,
    day: WEEK_A[0],
    title: 'Morning run',
    startMin: 360,
    durationMin: 60,
    categoryId: 'cat-health',
    status: 'completed',
    createdAt: '2024-01-15T06:00:00Z',
    ...overrides,
  }
}

function freshStore(activities: Activity[] = []) {
  // Remove atomFamily entries for all test days
  ;[...WEEK_A, ...WEEK_B].forEach((d) => dayActivitiesAtom.remove(d))
  const store = createStore()
  for (const a of activities) {
    store.set(addActivityAtom, a)
  }
  return store
}

// Build a fluent insert chain: db.insert().values() → resolves
function buildInsertChain(resolveWith: unknown = [{ id: TEMPLATE_ID }]) {
  const valuesFn = vi.fn().mockResolvedValue(resolveWith)
  const insertFn = vi.fn().mockReturnValue({ values: valuesFn })
  return { insertFn, valuesFn }
}

// Build a fluent select chain: db.select().from().where() → resolves
function buildSelectChain(rows: unknown[]) {
  const whereFn = vi.fn().mockResolvedValue(rows)
  const fromFn = vi.fn().mockReturnValue({ where: whereFn })
  const selectFn = vi.fn().mockReturnValue({ from: fromFn })
  return { selectFn, fromFn, whereFn }
}

// ----------------------------------------------------------------
// saveTemplate
// ----------------------------------------------------------------

describe('saveTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserts a weeklyTemplate row and template_activities without status', async () => {
    // Two activities in current week — one in Mon, one in Tue
    const actMon = makeActivity({ id: 'a1', day: WEEK_A[0], status: 'completed', categoryId: 'cat-1' })
    const actTue = makeActivity({ id: 'a2', day: WEEK_A[1], status: 'in_progress', categoryId: 'cat-2' })
    const store = freshStore([actMon, actTue])

    // First insert creates template row with id
    const tplInsertChain = buildInsertChain([{ id: TEMPLATE_ID }])
    const actInsertChain = buildInsertChain([])

    // First call = weekly_templates insert; second call = template_activities insert
    vi.mocked(db).insert = vi.fn()
      .mockReturnValueOnce({ values: vi.fn().mockResolvedValue([{ id: TEMPLATE_ID }]) })
      .mockReturnValueOnce({ values: vi.fn().mockResolvedValue([]) })

    await saveTemplate(store, WEEK_A, 'My Template', USER_ID)

    // db.insert should be called twice: template + activities
    expect(vi.mocked(db).insert).toHaveBeenCalledTimes(2)
  })

  it('saves template_activities with dayOfWeek (0-6) derived from weekDays index', async () => {
    const actMon = makeActivity({ id: 'a1', day: WEEK_A[0] }) // index 0 = dayOfWeek 0
    const actWed = makeActivity({ id: 'a2', day: WEEK_A[2] }) // index 2 = dayOfWeek 2
    const store = freshStore([actMon, actWed])

    let capturedActivitiesInsert: unknown[] = []

    vi.mocked(db).insert = vi.fn()
      .mockReturnValueOnce({ values: vi.fn().mockResolvedValue([{ id: TEMPLATE_ID }]) })
      .mockImplementationOnce(() => {
        return {
          values: vi.fn().mockImplementation((rows) => {
            capturedActivitiesInsert = rows
            return Promise.resolve([])
          }),
        }
      })

    await saveTemplate(store, WEEK_A, 'My Template', USER_ID)

    // dayOfWeek must be set from the index in weekDays
    expect(capturedActivitiesInsert).toHaveLength(2)
    const inserted = capturedActivitiesInsert as Array<{ dayOfWeek: number; title: string }>
    const mon = inserted.find((r) => r.title === 'Morning run' && r.dayOfWeek === 0)
    const wed = inserted.find((r) => r.title === 'Morning run' && r.dayOfWeek === 2)
    expect(mon).toBeDefined()
    expect(wed).toBeDefined()
  })

  it('template_activities rows do NOT include a status field', async () => {
    const act = makeActivity({ id: 'a1', day: WEEK_A[0], status: 'completed' })
    const store = freshStore([act])

    let capturedRows: unknown[] = []

    vi.mocked(db).insert = vi.fn()
      .mockReturnValueOnce({ values: vi.fn().mockResolvedValue([{ id: TEMPLATE_ID }]) })
      .mockImplementationOnce(() => {
        return {
          values: vi.fn().mockImplementation((rows) => {
            capturedRows = rows
            return Promise.resolve([])
          }),
        }
      })

    await saveTemplate(store, WEEK_A, 'My Template', USER_ID)

    const row = (capturedRows as Array<Record<string, unknown>>)[0]
    expect(row).not.toHaveProperty('status')
    // Must have structural fields
    expect(row).toHaveProperty('templateId')
    expect(row).toHaveProperty('dayOfWeek')
    expect(row).toHaveProperty('title')
    expect(row).toHaveProperty('startMin')
    expect(row).toHaveProperty('durationMin')
  })

  it('skips insert for template_activities if the week is empty', async () => {
    const store = freshStore([])

    vi.mocked(db).insert = vi.fn()
      .mockReturnValueOnce({ values: vi.fn().mockResolvedValue([{ id: TEMPLATE_ID }]) })

    await saveTemplate(store, WEEK_A, 'Empty Week', USER_ID)

    // Only 1 insert (template row), NOT a second insert for activities
    expect(vi.mocked(db).insert).toHaveBeenCalledTimes(1)
  })
})

// ----------------------------------------------------------------
// applyTemplate
// ----------------------------------------------------------------

describe('applyTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads template_activities from DB and inserts new activities with status=planned', async () => {
    const templateRows = [
      { id: 'ta-1', templateId: TEMPLATE_ID, dayOfWeek: 0, title: 'Run', startMin: 360, durationMin: 60, categoryId: 'cat-1' },
      { id: 'ta-2', templateId: TEMPLATE_ID, dayOfWeek: 1, title: 'Read', startMin: 480, durationMin: 30, categoryId: null },
    ]

    const { selectFn } = buildSelectChain(templateRows)
    vi.mocked(db).select = selectFn as unknown as typeof db.select

    // db.insert called once for bulk insert of new activities
    const insertValues = vi.fn().mockResolvedValue([])
    vi.mocked(db).insert = vi.fn().mockReturnValue({ values: insertValues })

    const store = freshStore([])

    await applyTemplate(store, TEMPLATE_ID, WEEK_A)

    // Activities must be inserted into DB
    expect(vi.mocked(db).insert).toHaveBeenCalledTimes(1)
    const rows = insertValues.mock.calls[0][0] as Array<Record<string, unknown>>
    expect(rows).toHaveLength(2)
    expect(rows.every((r) => r.status === 'planned')).toBe(true)
  })

  it('maps dayOfWeek to the correct ISO date from targetWeekDays', async () => {
    const templateRows = [
      { id: 'ta-1', templateId: TEMPLATE_ID, dayOfWeek: 0, title: 'Run', startMin: 360, durationMin: 60, categoryId: null },
      { id: 'ta-2', templateId: TEMPLATE_ID, dayOfWeek: 4, title: 'Yoga', startMin: 600, durationMin: 60, categoryId: null },
    ]

    const { selectFn } = buildSelectChain(templateRows)
    vi.mocked(db).select = selectFn as unknown as typeof db.select

    const insertValues = vi.fn().mockResolvedValue([])
    vi.mocked(db).insert = vi.fn().mockReturnValue({ values: insertValues })

    const store = freshStore([])

    await applyTemplate(store, TEMPLATE_ID, WEEK_A)

    const rows = insertValues.mock.calls[0][0] as Array<Record<string, unknown>>
    const runRow = rows.find((r) => r.title === 'Run')
    const yogaRow = rows.find((r) => r.title === 'Yoga')

    // dayOfWeek 0 → WEEK_A[0] = '2024-01-15'
    expect(runRow?.day).toBe(WEEK_A[0])
    // dayOfWeek 4 → WEEK_A[4] = '2024-01-19'
    expect(yogaRow?.day).toBe(WEEK_A[4])
  })

  it('seeds dayActivitiesAtom with newly created activities', async () => {
    const templateRows = [
      { id: 'ta-1', templateId: TEMPLATE_ID, dayOfWeek: 0, title: 'Run', startMin: 360, durationMin: 60, categoryId: null },
    ]

    const { selectFn } = buildSelectChain(templateRows)
    vi.mocked(db).select = selectFn as unknown as typeof db.select
    vi.mocked(db).insert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) })

    const store = freshStore([])

    await applyTemplate(store, TEMPLATE_ID, WEEK_A)

    // Atom for Monday must now have 1 activity
    const mondayActivities = store.get(dayActivitiesAtom(WEEK_A[0]))
    expect(mondayActivities).toHaveLength(1)
    expect(mondayActivities[0].status).toBe('planned')
    expect(mondayActivities[0].title).toBe('Run')
  })

  it('does nothing when template has no activities', async () => {
    const { selectFn } = buildSelectChain([])
    vi.mocked(db).select = selectFn as unknown as typeof db.select

    const store = freshStore([])

    await applyTemplate(store, TEMPLATE_ID, WEEK_A)

    // insert never called
    expect(vi.mocked(db).insert).not.toHaveBeenCalled()
    // All day atoms still empty
    WEEK_A.forEach((day) => {
      expect(store.get(dayActivitiesAtom(day))).toHaveLength(0)
    })
  })
})

// ----------------------------------------------------------------
// duplicatePreviousWeek
// ----------------------------------------------------------------

describe('duplicatePreviousWeek', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('copies previous week activities to current week with status=planned', async () => {
    const prevActs = [
      makeActivity({ id: 'p1', day: WEEK_B[0], status: 'completed', startMin: 360 }),
      makeActivity({ id: 'p2', day: WEEK_B[2], status: 'skipped', startMin: 480 }),
    ]
    const store = freshStore(prevActs)

    const insertValues = vi.fn().mockResolvedValue([])
    vi.mocked(db).insert = vi.fn().mockReturnValue({ values: insertValues })

    await duplicatePreviousWeek(store, WEEK_A, WEEK_B)

    // Two activities inserted with status=planned
    expect(vi.mocked(db).insert).toHaveBeenCalledTimes(1)
    const rows = insertValues.mock.calls[0][0] as Array<Record<string, unknown>>
    expect(rows).toHaveLength(2)
    expect(rows.every((r) => r.status === 'planned')).toBe(true)
  })

  it('maps previous week day to same weekday index in current week', async () => {
    // Prev week Mon → Current week Mon, Prev week Fri → Current week Fri
    const prevActs = [
      makeActivity({ id: 'p1', day: WEEK_B[0], startMin: 360 }), // Mon prev
      makeActivity({ id: 'p2', day: WEEK_B[4], startMin: 480 }), // Fri prev
    ]
    const store = freshStore(prevActs)

    const insertValues = vi.fn().mockResolvedValue([])
    vi.mocked(db).insert = vi.fn().mockReturnValue({ values: insertValues })

    await duplicatePreviousWeek(store, WEEK_A, WEEK_B)

    const rows = insertValues.mock.calls[0][0] as Array<Record<string, unknown>>
    const monRow = rows.find((r) => r.startMin === 360)
    const friRow = rows.find((r) => r.startMin === 480)

    // Mon prev (WEEK_B[0]) → Mon current (WEEK_A[0])
    expect(monRow?.day).toBe(WEEK_A[0])
    // Fri prev (WEEK_B[4]) → Fri current (WEEK_A[4])
    expect(friRow?.day).toBe(WEEK_A[4])
  })

  it('seeds dayActivitiesAtom for current week', async () => {
    const prevAct = makeActivity({ id: 'p1', day: WEEK_B[0], status: 'completed', title: 'Run' })
    const store = freshStore([prevAct])

    vi.mocked(db).insert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) })

    await duplicatePreviousWeek(store, WEEK_A, WEEK_B)

    const mondayActivities = store.get(dayActivitiesAtom(WEEK_A[0]))
    expect(mondayActivities).toHaveLength(1)
    expect(mondayActivities[0].status).toBe('planned')
    expect(mondayActivities[0].title).toBe('Run')
    // New activity must have a different id
    expect(mondayActivities[0].id).not.toBe('p1')
  })

  it('does nothing if previous week is empty', async () => {
    const store = freshStore([])

    await duplicatePreviousWeek(store, WEEK_A, WEEK_B)

    expect(vi.mocked(db).insert).not.toHaveBeenCalled()
    WEEK_A.forEach((day) => {
      expect(store.get(dayActivitiesAtom(day))).toHaveLength(0)
    })
  })
})
