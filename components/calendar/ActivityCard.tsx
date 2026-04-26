'use client'

import { useState } from 'react'
import type { Activity } from '@/atoms/calendar'
import type { Category } from '@/atoms/categories'
import { minToTime } from '@/lib/time'
import { getIconDisplay } from '@/lib/icons'

function fmtDuration(durationMin: number): string {
  const h = Math.floor(durationMin / 60)
  const m = durationMin % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

export interface ActivityCardProps {
  activity: Activity
  category: Category | undefined
  done: boolean
  onToggle: () => void | Promise<void>
  onDelete: () => void | Promise<void>
  onEdit: () => void
}

export function ActivityCard({ activity, category, done, onToggle, onDelete, onEdit }: ActivityCardProps) {
  const [hovered, setHovered] = useState(false)

  const color = category?.color ?? '#6366f1'
  const bg = done ? `${color}24` : `${color}12`
  const startTime = minToTime(activity.startMin)
  const endTime = minToTime(activity.startMin + activity.durationMin)
  const durationLabel = fmtDuration(activity.durationMin)

  return (
    <div
      data-testid={`act-card-${activity.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        background: bg,
        padding: '7px 8px',
        cursor: 'default',
      }}
    >
      {/* Edit + Delete buttons on hover */}
      {hovered && (
        <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 3 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            aria-label="Editar actividad"
            style={{
              width: 18, height: 18, borderRadius: '50%', border: 'none',
              background: 'rgba(0,0,0,0.08)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: '#666', lineHeight: 1, padding: 0,
            }}
          >
            ✎
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            aria-label="Eliminar actividad"
            style={{
              width: 18, height: 18, borderRadius: '50%', border: 'none',
              background: 'rgba(0,0,0,0.08)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: '#666', lineHeight: 1, padding: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
        {/* Checkbox */}
        <button
          onClick={() => onToggle()}
          aria-label={done ? 'Marcar como pendiente' : 'Marcar como completada'}
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: `2px solid ${color}`,
            background: done ? color : 'transparent',
            flexShrink: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            marginTop: 1,
            transition: 'all 0.15s',
          }}
        >
          {done && (
            <span style={{ color: '#fff', fontSize: 11, lineHeight: 1, fontWeight: 700 }}>✓</span>
          )}
        </button>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: '#1C1C1E',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textDecoration: done ? 'line-through' : 'none',
              opacity: done ? 0.65 : 1,
            }}
          >
            {category?.icon && <span style={{ marginRight: 3 }}>{getIconDisplay(category.icon)}</span>}
            <span style={{ color: done ? '#999' : '#1C1C1E' }}>{activity.title}</span>
          </p>
          <p
            style={{
              fontSize: 10.5,
              color: '#B0ADA8',
              margin: '2px 0 0',
            }}
          >
            {startTime}–{endTime} · {durationLabel}
          </p>
        </div>
      </div>
    </div>
  )
}
