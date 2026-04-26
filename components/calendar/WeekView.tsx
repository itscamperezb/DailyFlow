'use client'

import { useEffect, useCallback, useState } from 'react'
import { createStore, useAtomValue, useSetAtom } from 'jotai'
import { dayActivitiesAtom } from '@/atoms/calendar'
import { categoriesAtom } from '@/atoms/categories'
import { DayColumn } from './DayColumn'
import { AddActivityModal } from './AddActivityModal'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { createCategory, deleteCategory } from '@/actions/categories'
import { createActivity } from '@/actions/activities'
import { dbBatchCreateActivities } from '@/actions/activities.db'
import { getIconDisplay } from '@/lib/icons'
import { timeToMin } from '@/lib/time'


const COLOR_OPTIONS = [
  '#FF6B6B','#4A90D9','#9B59B6','#52B788',
  '#F4A261','#E91E8C','#1ABC9C','#E67E22',
  '#3498DB','#E74C3C','#F39C12','#8E44AD',
]

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

type JotaiStore = ReturnType<typeof createStore>

const DAY_ABBREVS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'jul', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function formatWeekLabel(weekDays: string[]): string {
  if (weekDays.length < 7) return ''
  const [, sm, sd] = weekDays[0].split('-').map(Number)
  const [, em, ed] = weekDays[6].split('-').map(Number)
  if (sm === em) {
    return `${sd}–${ed} de ${MONTHS_ES[sm - 1]}`
  }
  return `${sd} ${MONTHS_ES[sm - 1]} – ${ed} ${MONTHS_ES[em - 1]}`
}

function dateToWeekId(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  const year = d.getUTCFullYear()
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() || 7
  const week1Monday = new Date(jan4)
  week1Monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1))
  const diffMs = d.getTime() - week1Monday.getTime()
  const week = Math.floor(diffMs / (7 * 86400000)) + 1
  return `${year}-W${String(week).padStart(2, '0')}`
}

function shiftWeek(mondayIso: string, deltaWeeks: number): string {
  const d = new Date(mondayIso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + deltaWeeks * 7)
  return d.toISOString().slice(0, 10)
}

function getTodayWeekId(): string {
  const now = new Date()
  const iso = now.toISOString().slice(0, 10)
  // Find Monday of current week
  const d = new Date(iso + 'T00:00:00Z')
  const dow = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() - (dow - 1))
  return dateToWeekId(d.toISOString().slice(0, 10))
}

interface FinancesWeekData {
  salary: number
  payFrequency: string
  currency: string
  totalFixed: number
  weekVariable: number
}

export interface WeekViewProps {
  weekDays: string[]
  store: JotaiStore
  todayIso?: string
  userId?: string
  onNewActivity?: () => void
  finances?: FinancesWeekData | null
}

// Inner component that can read atoms (must be inside Provider)
function WeekViewInner({ weekDays, store, todayIso, userId, onNewActivity, finances }: WeekViewProps) {
  const categories = useAtomValue(categoriesAtom, { store })

  const [addActDay, setAddActDay] = useState<string | null>(null)
  const [showAddCat, setShowAddCat] = useState(false)
  const [scheduleCat, setScheduleCat] = useState<typeof categories[0] | null>(null)
  const [schedStart, setSchedStart] = useState('08:00')
  const [schedEnd, setSchedEnd] = useState('09:00')
  const [schedDays, setSchedDays] = useState<boolean[]>([true,true,true,true,true,false,false])
  const [schedName, setSchedName] = useState('')
  const [schedLoading, setSchedLoading] = useState(false)
  const [schedError, setSchedError] = useState<string | null>(null)
  const [schedScope, setSchedScope] = useState<'week' | 'year'>('week')
  const [deleteCat, setDeleteCat] = useState<typeof categories[0] | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatEmoji, setNewCatEmoji] = useState('🎯')
  const [newCatColor, setNewCatColor] = useState('#4A90D9')
  const [catLoading, setCatLoading] = useState(false)
  const setCategories = useSetAtom(categoriesAtom, { store })

  useEffect(() => {
    return () => {
      weekDays.forEach((day) => dayActivitiesAtom.remove(day))
    }
  }, [weekDays])

  const handlePrevWeek = useCallback(() => {
    const prevMonday = shiftWeek(weekDays[0], -1)
    window.location.href = `/week/${dateToWeekId(prevMonday)}`
  }, [weekDays])

  const handleNextWeek = useCallback(() => {
    const nextMonday = shiftWeek(weekDays[0], 1)
    window.location.href = `/week/${dateToWeekId(nextMonday)}`
  }, [weekDays])

  const handleTodayClick = useCallback(() => {
    window.location.href = `/week/${getTodayWeekId()}`
  }, [])

  const handleNewActivity = useCallback(() => {
    if (onNewActivity) {
      onNewActivity()
    } else {
      setAddActDay(todayIso ?? weekDays[0] ?? null)
    }
  }, [onNewActivity, todayIso, weekDays])

  useKeyboardShortcuts({
    onPrevWeek: handlePrevWeek,
    onNextWeek: handleNextWeek,
    onNewActivity: handleNewActivity,
    disabled: addActDay !== null,
  })

  const handleScheduleCategory = useCallback(async () => {
    if (!scheduleCat || schedLoading) return
    const startMin = timeToMin(schedStart)
    const endMin = timeToMin(schedEnd)
    if (isNaN(startMin) || isNaN(endMin)) {
      setSchedError('Ingresá un horario válido (ej: 08:00)')
      return
    }
    if (endMin <= startMin) {
      setSchedError('La hora de fin debe ser posterior a la de inicio')
      return
    }
    setSchedLoading(true)
    setSchedError(null)
    const title = `${getIconDisplay(scheduleCat.icon)} ${schedName || scheduleCat.name}`
    const durationMin = endMin - startMin

    try {
      if (schedScope === 'week') {
        const selectedDays = weekDays.filter((_, i) => schedDays[i])
        await Promise.all(selectedDays.map(day =>
          createActivity(store, {
            userId: userId ?? '', day, title, startMin, durationMin,
            categoryId: scheduleCat.id, status: 'planned',
          })
        ))
      } else {
        // Generate all matching dates from today to Dec 31 of this year
        const today = new Date().toISOString().slice(0, 10)
        const yearEnd = `${new Date().getUTCFullYear()}-12-31`
        const rows: Parameters<typeof dbBatchCreateActivities>[0] = []
        schedDays.forEach((selected, i) => {
          if (!selected) return
          // dayIndex 0=Mon…6=Sun → UTCDay 1=Mon…0=Sun
          const targetUTCDay = i === 6 ? 0 : i + 1
          const d = new Date(today + 'T00:00:00Z')
          const end = new Date(yearEnd + 'T00:00:00Z')
          while (d.getUTCDay() !== targetUTCDay) d.setUTCDate(d.getUTCDate() + 1)
          while (d <= end) {
            rows.push({
              id: crypto.randomUUID(),
              userId: userId ?? '',
              day: d.toISOString().slice(0, 10),
              title, startMin, durationMin,
              categoryId: scheduleCat.id,
              status: 'planned',
            })
            d.setUTCDate(d.getUTCDate() + 7)
          }
        })
        await dbBatchCreateActivities(rows)
        setScheduleCat(null)
        window.location.reload()
        return
      }
      setScheduleCat(null)
    } catch (err) {
      console.error('[schedule] Error:', err)
      setSchedError('No se pudo guardar. Revisá la consola para más detalles.')
    } finally {
      setSchedLoading(false)
    }
  }, [scheduleCat, schedStart, schedEnd, schedDays, schedName, schedScope, weekDays, store, userId, schedLoading])

  const handleDeleteCategory = useCallback(async () => {
    if (!deleteCat || deleteLoading) return
    setDeleteLoading(true)
    try {
      await deleteCategory(store, deleteCat.id, weekDays)
      setDeleteCat(null)
    } catch (err) {
      console.error('[deleteCategory] Error:', err)
    } finally {
      setDeleteLoading(false)
    }
  }, [deleteCat, deleteLoading, store, weekDays])

  const handleCreateCategory = useCallback(async () => {
    if (!newCatName.trim() || catLoading) return
    setCatLoading(true)
    try {
      await createCategory(
        store,
        { name: newCatName.trim(), color: newCatColor, icon: newCatEmoji },
        userId ?? ''
      )
      setNewCatName('')
      setNewCatEmoji('🎯')
      setNewCatColor('#4A90D9')
      setShowAddCat(false)
    } finally {
      setCatLoading(false)
    }
  }, [newCatName, newCatColor, newCatEmoji, catLoading, store, userId])

  const weekLabel = formatWeekLabel(weekDays)

  return (
    <div
      className="flex flex-col overflow-hidden h-full"
      style={{ background: '#F4F4F1', fontFamily: 'var(--font-plus-jakarta-sans, sans-serif)' }}
    >
      {/* ── Header ── */}
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #ECEAE6',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexShrink: 0,
          zIndex: 20,
        }}
      >
        <h1 style={{ fontSize: '15px', fontWeight: 700, color: '#1C1C1E', marginRight: 'auto' }}>
          Mi Horario Semanal
        </h1>

        {/* Section tabs: Horario Semanal | Manejo del dinero */}
        <div
          style={{
            background: '#F4F4F1',
            borderRadius: 8,
            padding: 3,
            display: 'flex',
          }}
        >
          <button
            style={{
              background: '#1C1C1E',
              color: 'white',
              borderRadius: 6,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Horario Semanal
          </button>
          <button
            onClick={() => { window.location.href = '/finances' }}
            style={{
              background: 'transparent',
              color: '#B0ADA8',
              borderRadius: 6,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Manejo del dinero
          </button>
        </div>

        {/* View toggle: Semana | Mes */}
        <div
          style={{
            background: '#F4F4F1',
            borderRadius: 8,
            padding: 3,
            display: 'flex',
          }}
        >
          <button
            style={{
              background: '#1C1C1E',
              color: 'white',
              borderRadius: 6,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Semana
          </button>
          <button
            onClick={() => {
              const [y, m] = weekDays[0].split('-')
              window.location.href = `/month/${y}-${m}`
            }}
            style={{
              background: 'transparent',
              color: '#B0ADA8',
              borderRadius: 6,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Mes
          </button>
        </div>

        {/* Week navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            data-testid="prev-week-btn"
            onClick={handlePrevWeek}
            aria-label="Previous week"
            style={{
              width: 28, height: 28, borderRadius: 6,
              border: '1px solid #ECEAE6', background: '#fff',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: '#1C1C1E',
            }}
          >
            ‹
          </button>

          <span
            data-testid="week-label"
            style={{ fontSize: '13px', fontWeight: 500, color: '#1C1C1E', minWidth: 120, textAlign: 'center' }}
          >
            {weekLabel}
          </span>

          <button
            data-testid="next-week-btn"
            onClick={handleNextWeek}
            aria-label="Next week"
            style={{
              width: 28, height: 28, borderRadius: 6,
              border: '1px solid #ECEAE6', background: '#fff',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: '#1C1C1E',
            }}
          >
            ›
          </button>

          <button
            onClick={handleTodayClick}
            style={{
              height: 28, padding: '0 10px', borderRadius: 6,
              border: '1px solid #ECEAE6', background: '#fff',
              cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#1C1C1E',
            }}
          >
            Hoy
          </button>
        </div>
      </header>

      {/* ── Category pills bar ── */}
      <div
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #ECEAE6',
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        {categories.map((cat) => (
          <div
            key={cat.id}
            style={{ display: 'flex', alignItems: 'center', gap: 2, borderRadius: 20, transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F4F4F1')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <button
              onClick={() => {
                setScheduleCat(cat)
                setSchedName(cat.name)
                setSchedDays([true,true,true,true,true,false,false])
                setSchedStart('08:00')
                setSchedEnd('09:00')
                setSchedScope('week')
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                whiteSpace: 'nowrap', cursor: 'pointer', background: 'none',
                border: 'none', padding: '3px 8px', borderRadius: 20,
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>
                {getIconDisplay(cat.icon)} {cat.name}
              </span>
            </button>
            <button
              onClick={() => setDeleteCat(cat)}
              title="Eliminar categoría"
              style={{
                fontSize: 10, color: '#CBCBC8', background: 'none', border: 'none',
                cursor: 'pointer', padding: '2px 6px 2px 0', lineHeight: 1,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#E74C3C')}
              onMouseLeave={e => (e.currentTarget.style.color = '#CBCBC8')}
            >✕</button>
          </div>
        ))}
        <button
          onClick={() => setShowAddCat(true)}
          style={{
            padding: '3px 11px', borderRadius: 20,
            border: '1.5px dashed #CCC', fontSize: 11.5,
            color: '#AAA', whiteSpace: 'nowrap', marginLeft: 4,
            cursor: 'pointer', background: 'none',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor='#999'; (e.currentTarget as HTMLButtonElement).style.color='#666' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor='#CCC'; (e.currentTarget as HTMLButtonElement).style.color='#AAA' }}
        >
          + Crear categoría
        </button>
      </div>

      {/* ── Body: 7 columns + sidebar ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '12px 16px', gap: '12px' }}>
        {/* Day columns grid */}
        <div style={{ display: 'flex', flex: 1, gap: '8px', overflow: 'hidden', minWidth: 0 }}>
          {weekDays.map((day, i) => {
            const isToday = day === todayIso
            const dateNum = parseInt(day.slice(8, 10), 10)
            return (
              <DayColumn
                key={day}
                day={day}
                store={store}
                isToday={isToday}
                dayAbbrev={DAY_ABBREVS[i]}
                dateNum={dateNum}
                onAdd={() => setAddActDay(day)}
              />
            )
          })}
        </div>

        {/* Sidebar */}
        <Sidebar weekDays={weekDays} todayIso={todayIso} finances={finances} />
      </div>

      {/* Add Activity Modal */}
      {addActDay !== null && (
        <AddActivityModal
          open={true}
          onClose={() => setAddActDay(null)}
          store={store}
          defaultDay={addActDay}
          userId={userId ?? ''}
        />
      )}

      {/* Delete Category Confirmation */}
      {deleteCat && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setDeleteCat(null) }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,15,15,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 300, backdropFilter: 'blur(6px)',
          }}
        >
          <div style={{
            background: 'white', borderRadius: 16, padding: '28px 28px 24px',
            width: 360, boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
          }}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>🗑️</div>
            <h2 style={{ fontSize: 15, fontWeight: 800, textAlign: 'center', marginBottom: 8, color: '#1C1C1E' }}>
              Eliminar categoría
            </h2>
            <p style={{ fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 1.6, marginBottom: 22 }}>
              ¿Deseas eliminar <strong style={{ color: deleteCat.color }}>{getIconDisplay(deleteCat.icon)} {deleteCat.name}</strong> y todas sus actividades del calendario?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setDeleteCat(null)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 10,
                  border: '1.5px solid #ECEAE6', background: 'white',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#666',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteCategory}
                disabled={deleteLoading}
                style={{
                  flex: 1, padding: '10px', borderRadius: 10,
                  border: 'none', background: '#E74C3C',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', color: 'white',
                  opacity: deleteLoading ? 0.6 : 1,
                }}
              >
                {deleteLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Category Modal */}
      {scheduleCat && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setScheduleCat(null) }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,15,15,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, backdropFilter: 'blur(6px)',
          }}
        >
          <div style={{
            background: 'white', borderRadius: 18, padding: '26px 28px',
            width: 400, boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: scheduleCat.color }} />
                <h2 style={{ fontSize: 15, fontWeight: 800 }}>
                  {getIconDisplay(scheduleCat.icon)} {scheduleCat.name}
                </h2>
              </div>
              <button onClick={() => setScheduleCat(null)} style={{ fontSize: 18, color: '#BCBCB8', cursor: 'pointer', background: 'none', border: 'none' }}>✕</button>
            </div>

            {/* Activity name */}
            <label style={{ fontSize: 11, fontWeight: 700, color: '#AAA', display: 'block', marginBottom: 6, letterSpacing: '0.06em' }}>NOMBRE DE LA ACTIVIDAD</label>
            <input
              value={schedName}
              onChange={e => setSchedName(e.target.value)}
              placeholder={scheduleCat.name}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 9,
                border: '1.5px solid #E8E8E4', fontSize: 13.5, outline: 'none',
                background: '#FAFAF8', marginBottom: 16, color: '#1C1C1E',
              }}
            />

            {/* Time range */}
            {(() => {
              const s = timeToMin(schedStart)
              const e = timeToMin(schedEnd)
              const timeError = schedStart && schedEnd && !isNaN(s) && !isNaN(e) && e <= s
              return (
                <>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#AAA', display: 'block', marginBottom: 6, letterSpacing: '0.06em' }}>HORARIO</label>
                  <div style={{ display: 'flex', gap: 10, marginBottom: timeError ? 6 : 16 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: '#AAA', display: 'block', marginBottom: 4 }}>Inicio</label>
                      <input type="time" value={schedStart} onChange={ev => setSchedStart(ev.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${timeError ? '#E74C3C' : '#E8E8E4'}`, fontSize: 13, outline: 'none', color: '#1C1C1E', background: '#FAFAF8' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: '#AAA', display: 'block', marginBottom: 4 }}>Fin</label>
                      <input type="time" value={schedEnd} onChange={ev => setSchedEnd(ev.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${timeError ? '#E74C3C' : '#E8E8E4'}`, fontSize: 13, outline: 'none', color: '#1C1C1E', background: '#FAFAF8' }} />
                    </div>
                  </div>
                  {timeError && (
                    <p style={{ fontSize: 11.5, color: '#E74C3C', marginBottom: 12, marginTop: 0 }}>
                      La hora de fin debe ser posterior a la de inicio.
                    </p>
                  )}
                </>
              )
            })()}

            {/* Scope toggle */}
            <label style={{ fontSize: 11, fontWeight: 700, color: '#AAA', display: 'block', marginBottom: 8, letterSpacing: '0.06em' }}>REPETIR</label>
            <div style={{ display: 'flex', background: '#F4F4F1', borderRadius: 8, padding: 3, marginBottom: 16 }}>
              {(['week', 'year'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSchedScope(s)}
                  style={{
                    flex: 1, padding: '5px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                    background: schedScope === s ? '#1C1C1E' : 'transparent',
                    color: schedScope === s ? 'white' : '#B0ADA8',
                  }}
                >
                  {s === 'week' ? 'Solo esta semana' : 'Resto del año'}
                </button>
              ))}
            </div>

            {/* Day checkboxes */}
            <label style={{ fontSize: 11, fontWeight: 700, color: '#AAA', display: 'block', marginBottom: 8, letterSpacing: '0.06em' }}>DÍAS DE LA SEMANA</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
              {DAY_NAMES.map((d, i) => (
                <button
                  key={d}
                  onClick={() => setSchedDays(prev => prev.map((v, j) => j === i ? !v : v))}
                  style={{
                    flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                    background: schedDays[i] ? scheduleCat.color : '#F0EDE8',
                    color: schedDays[i] ? 'white' : '#B0ADA8',
                  }}
                >
                  {d.slice(0, 1)}
                </button>
              ))}
            </div>

            {schedError && (
              <p style={{ fontSize: 12, color: '#DC2626', marginBottom: 10 }}>{schedError}</p>
            )}

            <button
              onClick={handleScheduleCategory}
              disabled={schedLoading || !schedDays.some(Boolean)}
              style={{
                width: '100%', padding: 12, borderRadius: 10, border: 'none',
                background: scheduleCat.color, color: 'white', fontSize: 14,
                fontWeight: 800, cursor: 'pointer',
                opacity: schedLoading || !schedDays.some(Boolean) ? 0.5 : 1,
              }}
            >
              {schedLoading ? 'Guardando...' : `Agregar a ${schedDays.filter(Boolean).length} día(s)`}
            </button>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      {showAddCat && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowAddCat(false) }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,15,15,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, backdropFilter: 'blur(6px)',
          }}
        >
          <div style={{
            background: 'white', borderRadius: 18, padding: '26px 28px',
            width: 380, boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1C1C1E' }}>Nueva categoría</h2>
              <button onClick={() => setShowAddCat(false)} style={{ fontSize: 18, color: '#BCBCB8', cursor: 'pointer', background: 'none', border: 'none' }}>✕</button>
            </div>

            {/* Emoji + Name row */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 72 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#AAA', display: 'block', marginBottom: 6, letterSpacing: '0.06em' }}>EMOJI</label>
                <input
                  value={newCatEmoji}
                  onChange={e => setNewCatEmoji(e.target.value)}
                  maxLength={4}
                  style={{
                    width: '100%', padding: '8px', borderRadius: 9, border: '1.5px solid #E8E8E4',
                    fontSize: 20, textAlign: 'center', outline: 'none', background: '#FAFAF8', color: '#1C1C1E',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#AAA', display: 'block', marginBottom: 6, letterSpacing: '0.06em' }}>NOMBRE</label>
                <input
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="Ej: Deportes"
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateCategory() }}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 9,
                    border: '1.5px solid #E8E8E4', fontSize: 13.5, outline: 'none',
                    background: '#FAFAF8', color: '#1C1C1E',
                  }}
                />
              </div>
            </div>

            {/* Color picker */}
            <label style={{ fontSize: 11, fontWeight: 700, color: '#AAA', display: 'block', marginBottom: 6, letterSpacing: '0.06em' }}>COLOR</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
              {COLOR_OPTIONS.map(c => (
                <button key={c} onClick={() => setNewCatColor(c)} style={{
                  width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                  border: newCatColor === c ? `3px solid ${c}` : '3px solid transparent',
                  outline: newCatColor === c ? '2px solid white' : '2px solid transparent',
                  outlineOffset: -3,
                }} />
              ))}
            </div>

            {/* Preview */}
            <div style={{
              background: `${newCatColor}14`, borderLeft: `3px solid ${newCatColor}`,
              borderRadius: 8, padding: '10px 12px', marginBottom: 18,
              fontSize: 13, fontWeight: 600, color: '#1C1C1E',
            }}>
              {newCatEmoji} {newCatName || 'Vista previa'}
            </div>

            <button
              onClick={handleCreateCategory}
              disabled={!newCatName.trim() || catLoading}
              style={{
                width: '100%', padding: 12, borderRadius: 10,
                background: newCatColor, color: 'white', fontSize: 14,
                fontWeight: 800, cursor: 'pointer', border: 'none',
                opacity: !newCatName.trim() || catLoading ? 0.5 : 1,
              }}
            >
              {catLoading ? 'Creando...' : 'Crear categoría'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function WeekView(props: WeekViewProps) {
  return <WeekViewInner {...props} />
}

