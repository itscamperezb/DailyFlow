'use client'

import { useState } from 'react'
import { createStore, useAtomValue } from 'jotai'
import { categoriesAtom } from '@/atoms/categories'
import { updateActivity } from '@/actions/activities'
import { timeToMin, minToTime } from '@/lib/time'
import { getIconDisplay } from '@/lib/icons'
import type { Activity } from '@/atoms/calendar'

type JotaiStore = ReturnType<typeof createStore>

interface EditActivityModalProps {
  activity: Activity
  store: JotaiStore
  onClose: () => void
}

function fmtDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

export function EditActivityModal({ activity, store, onClose }: EditActivityModalProps) {
  const categories = useAtomValue(categoriesAtom, { store })

  const [title, setTitle] = useState(activity.title)
  const [startTime, setStartTime] = useState(minToTime(activity.startMin))
  const [endTime, setEndTime] = useState(minToTime(activity.startMin + activity.durationMin))
  const [categoryId, setCategoryId] = useState(activity.categoryId ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startMin = timeToMin(startTime)
  const endMin = timeToMin(endTime)
  const durationMin = endMin - startMin
  const selectedCat = categories.find(c => c.id === categoryId)
  const timeError = startTime && endTime && !isNaN(startMin) && !isNaN(endMin) && endMin <= startMin

  const handleSubmit = async () => {
    if (!title.trim()) { setError('El nombre es obligatorio'); return }
    if (isNaN(startMin) || isNaN(endMin)) { setError('Horario inválido'); return }
    if (endMin <= startMin) { setError('La hora de fin debe ser posterior a la de inicio'); return }
    setIsSubmitting(true)
    setError(null)
    try {
      await updateActivity(store, activity.id, activity.day, {
        title: title.trim(),
        startMin,
        durationMin,
        categoryId: categoryId || null,
      })
      onClose()
    } catch {
      setError('No se pudo guardar. Intentá de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid #ECEAE6', fontSize: 13, color: '#1C1C1E',
    outline: 'none', background: '#fff', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: '#B0ADA8',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    marginBottom: 6, display: 'block',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
        zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: 18, padding: 24, width: 360,
        maxWidth: '90vw', display: 'flex', flexDirection: 'column', gap: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>
            Editar actividad
          </h2>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: '50%', border: 'none',
            background: '#F4F4F1', cursor: 'pointer', fontSize: 16, color: '#B0ADA8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Title */}
        <div>
          <label style={labelStyle}>Nombre</label>
          <input
            style={inputStyle}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            autoFocus
          />
        </div>

        {/* Category */}
        <div>
          <label style={labelStyle}>Categoría</label>
          <select
            style={{ ...inputStyle, appearance: 'none' as const }}
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
          >
            <option value="">Sin categoría</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {getIconDisplay(cat.icon)} {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Times */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Inicio</label>
            <input
              type="time"
              style={{ ...inputStyle, borderColor: timeError ? '#E74C3C' : '#ECEAE6' }}
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Fin</label>
            <input
              type="time"
              style={{ ...inputStyle, borderColor: timeError ? '#E74C3C' : '#ECEAE6' }}
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
            />
          </div>
        </div>

        {timeError && (
          <p style={{ fontSize: 11.5, color: '#E74C3C', margin: 0 }}>
            La hora de fin debe ser posterior a la de inicio.
          </p>
        )}

        {/* Duration preview */}
        {durationMin > 0 && !timeError && (
          <div style={{ textAlign: 'center' }}>
            <span style={{
              display: 'inline-block', padding: '4px 12px', borderRadius: 20,
              background: selectedCat ? `${selectedCat.color}20` : '#F4F4F1',
              border: `1px solid ${selectedCat ? selectedCat.color + '40' : '#ECEAE6'}`,
              fontSize: 12, fontWeight: 600,
              color: selectedCat?.color ?? '#B0ADA8',
            }}>
              {fmtDuration(durationMin)}
            </span>
          </div>
        )}

        {error && <p style={{ fontSize: 12, color: '#DC2626', margin: 0 }}>{error}</p>}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !!timeError}
          style={{
            padding: 10, borderRadius: 10, border: 'none',
            background: selectedCat?.color ?? '#2563EB',
            color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting || timeError ? 0.6 : 1,
          }}
        >
          {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
