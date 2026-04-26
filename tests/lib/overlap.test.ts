import { describe, it, expect } from 'vitest'
import { positionActivities, type ActivityInput } from '@/lib/overlap'

function act(id: string, startMin: number, durationMin: number): ActivityInput {
  return { id, startMin, durationMin }
}

describe('positionActivities — no overlaps', () => {
  it('returns empty array for empty input', () => {
    expect(positionActivities([])).toEqual([])
  })

  it('single activity gets columnIndex 0 and columnCount 1', () => {
    const result = positionActivities([act('a', 360, 60)])
    expect(result).toHaveLength(1)
    expect(result[0].columnIndex).toBe(0)
    expect(result[0].columnCount).toBe(1)
  })

  it('two non-overlapping activities each get columnIndex 0, columnCount 1', () => {
    // a: 360–420, b: 480–540 → no overlap
    const result = positionActivities([act('a', 360, 60), act('b', 480, 60)])
    const a = result.find((r) => r.id === 'a')!
    const b = result.find((r) => r.id === 'b')!
    expect(a.columnIndex).toBe(0)
    expect(a.columnCount).toBe(1)
    expect(b.columnIndex).toBe(0)
    expect(b.columnCount).toBe(1)
  })

  it('activity ending exactly when next starts is NOT overlapping', () => {
    // a: 360–420, b: 420–480 → touching but not overlapping
    const result = positionActivities([act('a', 360, 60), act('b', 420, 60)])
    const a = result.find((r) => r.id === 'a')!
    const b = result.find((r) => r.id === 'b')!
    expect(a.columnIndex).toBe(0)
    expect(a.columnCount).toBe(1)
    expect(b.columnIndex).toBe(0)
    expect(b.columnCount).toBe(1)
  })
})

describe('positionActivities — two overlapping activities', () => {
  it('two overlapping activities get different column indices', () => {
    // a: 360–480, b: 420–540 → overlap
    const result = positionActivities([act('a', 360, 120), act('b', 420, 120)])
    const a = result.find((r) => r.id === 'a')!
    const b = result.find((r) => r.id === 'b')!
    expect(a.columnCount).toBe(2)
    expect(b.columnCount).toBe(2)
    expect(a.columnIndex).not.toBe(b.columnIndex)
    expect([0, 1]).toContain(a.columnIndex)
    expect([0, 1]).toContain(b.columnIndex)
  })
})

describe('positionActivities — three overlapping activities', () => {
  it('three fully overlapping activities get indices 0, 1, 2', () => {
    // a: 360–540, b: 360–540, c: 360–540 → all overlap
    const result = positionActivities([
      act('a', 360, 180),
      act('b', 360, 180),
      act('c', 360, 180),
    ])
    const indices = result.map((r) => r.columnIndex).sort()
    expect(indices).toEqual([0, 1, 2])
    result.forEach((r) => expect(r.columnCount).toBe(3))
  })
})

describe('positionActivities — mixed groups', () => {
  it('two separate groups each get their own column counts', () => {
    // Group 1: a+b overlap (360–480 and 420–540)
    // Group 2: c alone (600–660)
    const result = positionActivities([
      act('a', 360, 120),
      act('b', 420, 120),
      act('c', 600, 60),
    ])
    const a = result.find((r) => r.id === 'a')!
    const b = result.find((r) => r.id === 'b')!
    const c = result.find((r) => r.id === 'c')!

    expect(a.columnCount).toBe(2)
    expect(b.columnCount).toBe(2)
    expect(a.columnIndex).not.toBe(b.columnIndex)

    expect(c.columnCount).toBe(1)
    expect(c.columnIndex).toBe(0)
  })
})

describe('positionActivities — preserves all input fields', () => {
  it('output contains all original activity fields plus columnIndex and columnCount', () => {
    const input = [act('x', 480, 45)]
    const result = positionActivities(input)
    expect(result[0].id).toBe('x')
    expect(result[0].startMin).toBe(480)
    expect(result[0].durationMin).toBe(45)
    expect(typeof result[0].columnIndex).toBe('number')
    expect(typeof result[0].columnCount).toBe('number')
  })
})
