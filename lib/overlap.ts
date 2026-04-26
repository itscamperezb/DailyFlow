export interface ActivityInput {
  id: string
  startMin: number
  durationMin: number
}

export interface PositionedActivity extends ActivityInput {
  columnIndex: number
  columnCount: number
}

/**
 * Returns true if two activities overlap in time.
 * Touching (end === start) is NOT considered an overlap.
 */
function overlaps(a: ActivityInput, b: ActivityInput): boolean {
  const aEnd = a.startMin + a.durationMin
  const bEnd = b.startMin + b.durationMin
  return a.startMin < bEnd && b.startMin < aEnd
}

/**
 * Group activities into clusters where every pair within a cluster overlaps
 * (transitive: if A overlaps B and B overlaps C, all three are in one group).
 */
function buildGroups(activities: ActivityInput[]): ActivityInput[][] {
  const groups: ActivityInput[][] = []

  for (const activity of activities) {
    // Find all existing groups that this activity overlaps with
    const overlappingGroupIndices: number[] = []

    for (let i = 0; i < groups.length; i++) {
      const groupOverlaps = groups[i].some((member) => overlaps(activity, member))
      if (groupOverlaps) {
        overlappingGroupIndices.push(i)
      }
    }

    if (overlappingGroupIndices.length === 0) {
      // No overlap with any existing group → new group
      groups.push([activity])
    } else {
      // Merge all overlapping groups into the first one
      const [first, ...rest] = overlappingGroupIndices
      groups[first].push(activity)
      // Merge remaining groups into first (reverse order to keep indices valid)
      for (let i = rest.length - 1; i >= 0; i--) {
        const mergeIdx = rest[i]
        groups[first].push(...groups[mergeIdx])
        groups.splice(mergeIdx, 1)
      }
    }
  }

  return groups
}

/**
 * Assign column indices within a group using a greedy algorithm:
 * for each activity (sorted by start time), pick the lowest column index
 * not occupied by an overlapping, already-placed activity.
 */
function assignColumns(
  group: ActivityInput[]
): Map<string, { columnIndex: number; columnCount: number }> {
  const sorted = [...group].sort((a, b) => a.startMin - b.startMin)
  const assigned = new Map<string, number>() // id → columnIndex

  for (const activity of sorted) {
    const usedColumns = new Set<number>()

    for (const [otherId, otherCol] of assigned) {
      const other = group.find((a) => a.id === otherId)!
      if (overlaps(activity, other)) {
        usedColumns.add(otherCol)
      }
    }

    let col = 0
    while (usedColumns.has(col)) col++
    assigned.set(activity.id, col)
  }

  const columnCount = Math.max(...assigned.values()) + 1
  const result = new Map<string, { columnIndex: number; columnCount: number }>()

  for (const [id, columnIndex] of assigned) {
    result.set(id, { columnIndex, columnCount })
  }

  return result
}

/**
 * Position activities by computing overlapping groups and assigning
 * column indices within each group.
 */
export function positionActivities(
  activities: ActivityInput[]
): PositionedActivity[] {
  if (activities.length === 0) return []

  const groups = buildGroups(activities)
  const positionMap = new Map<string, { columnIndex: number; columnCount: number }>()

  for (const group of groups) {
    const positions = assignColumns(group)
    for (const [id, pos] of positions) {
      positionMap.set(id, pos)
    }
  }

  return activities.map((activity) => {
    const pos = positionMap.get(activity.id)!
    return {
      ...activity,
      columnIndex: pos.columnIndex,
      columnCount: pos.columnCount,
    }
  })
}
