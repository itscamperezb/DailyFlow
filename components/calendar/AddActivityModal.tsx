'use client'

import { useState } from 'react'
import { createStore, useAtomValue } from 'jotai'
import { categoriesAtom } from '@/atoms/categories'
import { createActivity } from '@/actions/activities'
import { timeToMin, minToTime } from '@/lib/time'
import { getIconDisplay } from '@/lib/icons'

type JotaiStore = ReturnType<typeof createStore>

export interface AddActivityModalProps {
  open: boolean
  onClose: () => void
  store: JotaiStore
  defaultDay: string
  userId: string
}


function fmtDuration(durationMin: number): string {
  const h = Math.floor(durationMin / 60)
  const m = durationMin % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

export function AddActivityModal({ open, onClose, store, defaultDay, userId }: AddActivityModalProps) {
  const categories = useAtomValue(categoriesAtom, { store })

  const [emoji, setEmoji] = useState('')
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const durationMin = Math.max(15, timeToMin(endTime) - timeToMin(startTime))
  const selectedCat = categories.find(c => c.id === categoryId)

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    if (!categoryId) {
      setError('Seleccioná una categoría')
      return
    }
    const startMin = timeToMin(startTime)
    const endMin = timeToMin(endTime)
    if (endMin <= startMin) {
      setError('La hora de fin debe ser posterior a la de inicio')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await createActivity(store, {
        userId,
        day: defaultDay,
        title: `${emoji ? emoji + ' ' : ''}${name.trim()}`,
        startMin,
        durationMin: endMin - startMin,
        categoryId,
        status: 'planned',
      })
      onClose()
    } catch {
      setError('No se pudo guardar. Intentá de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const modalStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 18,
    padding: '24px',
    width: 360,
    maxWidth: '90vw',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: '#B0ADA8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 6,
    display: 'block',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #ECEAE6',
    fontSize: 13,
    color: '#1C1C1E',
    outline: 'none',
    background: '#fff',
    boxSizing: 'border-box',
  }

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>
            Nueva actividad
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              border: 'none', background: '#F4F4F1',
              cursor: 'pointer', fontSize: 16, color: '#B0ADA8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Emoji input */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ width: 56 }}>
            <label style={labelStyle} htmlFor="add-activity-emoji">Emoji</label>
            <input
              id="add-activity-emoji"
              style={{ ...inputStyle, textAlign: 'center' }}
              placeholder="😀"
              value={emoji}
              onChange={e => setEmoji(e.target.value)}
              maxLength={4}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle} htmlFor="add-activity-name">Nombre</label>
            <input
              id="add-activity-name"
              style={inputStyle}
              placeholder="ej. Ir al gimnasio"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
              autoFocus
            />
          </div>
        </div>


        {/* Category */}
        <div>
          <label style={labelStyle} htmlFor="add-activity-category">Categoría</label>
          <select
            id="add-activity-category"
            style={{ ...inputStyle, appearance: 'none' as const }}
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
          >
            <option value="">Seleccioná una categoría…</option>
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
            <label style={labelStyle} htmlFor="add-activity-start">Inicio</label>
            <input
              id="add-activity-start"
              type="time"
              placeholder="08:00"
              style={inputStyle}
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle} htmlFor="add-activity-end">Fin</label>
            <input
              id="add-activity-end"
              type="time"
              placeholder="09:00"
              style={inputStyle}
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
            />
          </div>
        </div>

        {/* Duration preview */}
        {durationMin > 0 && (
          <div style={{ textAlign: 'center' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: 20,
                background: selectedCat ? `${selectedCat.color}20` : '#F4F4F1',
                border: `1px solid ${selectedCat ? selectedCat.color + '40' : '#ECEAE6'}`,
                fontSize: 12,
                fontWeight: 600,
                color: selectedCat?.color ?? '#B0ADA8',
              }}
            >
              {fmtDuration(durationMin)}
            </span>
          </div>
        )}

        {error && (
          <p style={{ fontSize: 12, color: '#DC2626', margin: 0 }}>{error}</p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{
            padding: '10px',
            borderRadius: 10,
            border: 'none',
            background: selectedCat?.color ?? '#2563EB',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.6 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {isSubmitting ? 'Guardando…' : 'Añadir actividad'}
        </button>
      </div>
    </div>
  )
}
