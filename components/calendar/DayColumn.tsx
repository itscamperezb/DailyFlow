'use client'

import { useRef, useState } from 'react'
import { useAtomValue } from 'jotai'
import { createStore } from 'jotai'
import { dayActivitiesAtom } from '@/atoms/calendar'
import { categoriesAtom } from '@/atoms/categories'
import { EditActivityModal } from './EditActivityModal'
import { updateActivityStatus, deleteActivity } from '@/actions/activities'
import { getIconDisplay } from '@/lib/icons'
import { minToTime, DAY_START_MIN, DAY_END_MIN } from '@/lib/time'
import type { Activity } from '@/atoms/calendar'

type JotaiStore = ReturnType<typeof createStore>

export interface DayColumnProps {
  day: string
  store: JotaiStore
  isToday?: boolean
  dayAbbrev?: string
  dateNum?: number
  onAdd?: () => void
}

const DAY_TOTAL = DAY_END_MIN - DAY_START_MIN // 1080 minutes

function toPct(min: number): number {
  return ((Math.max(min, DAY_START_MIN) - DAY_START_MIN) / DAY_TOTAL) * 100
}

function toHeightPct(startMin: number, durationMin: number): number {
  const clampedStart = Math.max(startMin, DAY_START_MIN)
  const clampedEnd = Math.min(startMin + durationMin, DAY_END_MIN)
  return Math.max(((clampedEnd - clampedStart) / DAY_TOTAL) * 100, 1)
}

function computePct(completed: number, total: number): number {
  if (total === 0) return 0
  return Math.min(100, Math.round((completed / total) * 100))
}

interface ActivityBlockProps {
  activity: Activity
  color: string
  heightPct: number
  onToggle: () => void
  onDelete: () => void
  onEdit: () => void
}

function ActivityBlockItem({ activity, color, heightPct, onToggle, onDelete, onEdit }: ActivityBlockProps) {
  const [hovered, setHovered] = useState(false)
  const done = activity.status === 'completed'
  const compact = heightPct < 5 // less than ~5% of day ≈ less than ~54min
  const startTime = minToTime(activity.startMin)
  const endTime = minToTime(activity.startMin + activity.durationMin)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: '100%',
        borderLeft: `3px solid ${color}`,
        borderRadius: 6,
        background: done ? `${color}28` : `${color}14`,
        padding: compact ? '2px 4px' : '4px 6px',
        overflow: 'hidden',
        cursor: 'default',
        position: 'relative',
        transition: 'background 0.15s',
      }}
    >
      {/* Hover actions */}
      {hovered && (
        <div style={{ position: 'absolute', top: 2, right: 2, display: 'flex', gap: 2, zIndex: 1 }}>
          <button onClick={e => { e.stopPropagation(); onEdit() }} style={iconBtn}>✎</button>
          <button onClick={e => { e.stopPropagation(); onDelete() }} style={iconBtn}>✕</button>
        </div>
      )}

      {/* Checkbox + title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
        <button
          onClick={onToggle}
          style={{
            width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
            border: `2px solid ${color}`, background: done ? color : 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, marginTop: 1,
          }}
        >
          {done && <span style={{ color: '#fff', fontSize: 8, fontWeight: 700 }}>✓</span>}
        </button>
        <p style={{
          fontSize: 11, fontWeight: 600, color: done ? '#999' : '#1C1C1E',
          margin: 0, overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap', flex: 1,
          textDecoration: done ? 'line-through' : 'none',
        }}>
          {activity.title}
        </p>
      </div>

      {/* Time range — only if enough height */}
      {!compact && (
        <p style={{ fontSize: 9.5, color: '#B0ADA8', margin: '2px 0 0 18px' }}>
          {startTime}–{endTime}
        </p>
      )}
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  width: 16, height: 16, borderRadius: '50%', border: 'none',
  background: 'rgba(0,0,0,0.1)', cursor: 'pointer', fontSize: 9,
  color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
}

export function DayColumn({ day, store, isToday, dayAbbrev, dateNum, onAdd }: DayColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null)
  const activities = useAtomValue(dayActivitiesAtom(day), { store })
  const categories = useAtomValue(categoriesAtom, { store })
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)

  const sorted = [...activities].sort((a, b) => a.startMin - b.startMin)
  const completedMin = sorted.filter(a => a.status === 'completed').reduce((s, a) => s + a.durationMin, 0)
  const totalMin = sorted.reduce((s, a) => s + a.durationMin, 0)
  const pct = computePct(completedMin, totalMin)

  const isToday_ = isToday ?? false
  const abbrev = dayAbbrev ?? day.slice(0, 3).toUpperCase()
  const num = dateNum ?? parseInt(day.slice(8, 10), 10)

  return (
    <>
      <div
        ref={columnRef}
        data-testid="day-column"
        style={{
          display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0,
          background: isToday_ ? '#F0F7FF' : '#ffffff',
          borderRadius: 12,
          border: isToday_ ? '1.5px solid #BED5F7' : '1px solid #ECEAE6',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 8px 6px', borderBottom: '1px solid #ECEAE6', flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: isToday_ ? '#2563EB' : '#B0ADA8', textTransform: 'uppercase' }}>
            {abbrev}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: isToday_ ? '#2563EB' : '#1C1C1E' }}>
            {num}
          </span>
          <span style={{ fontSize: 10, fontWeight: 500, color: isToday_ ? '#2563EB' : '#B0ADA8' }}>
            {totalMin > 0 ? `${pct}%` : ''}
          </span>
        </div>

        {/* Time grid — fixed height, percentage-based positioning */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* Activities */}
          {sorted.map(activity => {
            const cat = categories.find(c => c.id === activity.categoryId)
            const color = cat?.color ?? '#6366f1'
            const topPct = toPct(activity.startMin)
            const heightPct = toHeightPct(activity.startMin, activity.durationMin)
            return (
              <div
                key={activity.id}
                data-activity-wrapper
                style={{
                  position: 'absolute',
                  top: `${topPct}%`,
                  left: 2, right: 2,
                  height: `${heightPct}%`,
                }}
              >
                <ActivityBlockItem
                  activity={activity}
                  color={color}
                  heightPct={heightPct}
                  onToggle={async () => {
                    const newStatus = activity.status === 'completed' ? 'planned' : 'completed'
                    await updateActivityStatus(store, activity.id, activity.day, newStatus)
                  }}
                  onDelete={async () => deleteActivity(store, activity.id, activity.day)}
                  onEdit={() => setEditingActivity(activity)}
                />
              </div>
            )
          })}

          {sorted.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', pointerEvents: 'none' }}>
              <span style={{ fontSize: 10, color: '#D0CEC9' }}>Sin actividades</span>
            </div>
          )}
        </div>

        {/* Add button */}
        <div style={{ padding: '4px 6px 6px', flexShrink: 0 }}>
          <button
            onClick={onAdd}
            style={{
              width: '100%', padding: '5px', borderRadius: 8,
              border: '1.5px dashed #ECEAE6', background: 'transparent',
              cursor: 'pointer', fontSize: 11, color: '#B0ADA8', textAlign: 'center',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2563EB'; (e.currentTarget as HTMLButtonElement).style.color = '#2563EB' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#ECEAE6'; (e.currentTarget as HTMLButtonElement).style.color = '#B0ADA8' }}
          >
            + Añadir
          </button>
        </div>
      </div>

      {editingActivity && (
        <EditActivityModal
          activity={editingActivity}
          store={store}
          onClose={() => setEditingActivity(null)}
        />
      )}
    </>
  )
}
