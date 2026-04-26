'use client'

import { useMemo } from 'react'
import { useAtomValue } from 'jotai'
import { weekMetricsAtom } from '@/atoms/metrics'
import { categoriesAtom } from '@/atoms/categories'
import { getIconDisplay } from '@/lib/icons'

interface FinancesWeekData {
  salary: number        // cents
  payFrequency: string  // 'monthly' | 'biweekly' | 'weekly'
  currency: string
  totalFixed: number    // cents — sum of all fixed_expenses monthly_amount
  weekVariable: number  // cents — sum of variable_expenses in current week
}

interface SidebarProps {
  weekDays: string[]
  todayIso?: string
  finances?: FinancesWeekData | null
}

const SHORT_LABELS: Record<number, string> = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 0: 'D' }

function getDayShort(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return SHORT_LABELS[dow] ?? '?'
}

function computePct(completed: number, planned: number): number {
  if (planned === 0) return 0
  return Math.min(100, Math.round((completed / planned) * 100))
}

function fmtHours(min: number): string {
  const h = min / 60
  return h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`
}

// ── Streak: simplified streak calculation from weekDays completion ──
function computeStreak(
  weekDays: string[],
  dailyProgress: Record<string, { completed: number; planned: number }>,
  todayIso?: string
): number {
  // Count consecutive days from today backward with pct > 0
  let streak = 0
  const today = todayIso ?? new Date().toISOString().slice(0, 10)
  // sort days descending
  const days = [...weekDays].sort((a, b) => (a > b ? -1 : 1))
  for (const day of days) {
    if (day > today) continue
    const { completed, planned } = dailyProgress[day] ?? { completed: 0, planned: 0 }
    if (planned > 0 && completed > 0) {
      streak++
    } else {
      break
    }
  }
  return streak
}

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 12,
  border: '1px solid #ECEAE6',
  padding: '12px 14px',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#B0ADA8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.07em',
  marginBottom: 10,
}

function fmtMoneySidebar(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function Sidebar({ weekDays, todayIso, finances }: SidebarProps) {
  const metricsAtom = useMemo(() => weekMetricsAtom(weekDays), [weekDays.join(',')])
  const metrics = useAtomValue(metricsAtom)
  const categories = useAtomValue(categoriesAtom)

  const weekPct = Math.round(metrics.weeklyPct * 100)
  const streak = computeStreak(weekDays, metrics.dailyProgress, todayIso)

  // Max height for bar chart
  const maxBarPct = Math.max(
    ...weekDays.map((d) => computePct(metrics.dailyProgress[d]?.completed ?? 0, metrics.dailyProgress[d]?.planned ?? 0)),
    1
  )

  // Hours per category — show any category with planned OR completed hours
  const catHours = categories
    .map((cat) => ({
      cat,
      completed: metrics.hoursByCategory[cat.id] ?? 0,
      planned: metrics.plannedHoursByCategory[cat.id] ?? 0,
    }))
    .filter((c) => c.planned > 0)

  const maxHours = catHours.length > 0 ? Math.max(...catHours.map(c => c.planned)) : 1

  return (
    <aside
      data-testid="sidebar"
      style={{
        width: 268,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        overflowY: 'auto',
      }}
    >
      {/* ── Progreso Diario ── */}
      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Progreso Diario</p>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 56 }}>
          {weekDays.map((day) => {
            const { completed, planned } = metrics.dailyProgress[day] ?? { completed: 0, planned: 0 }
            const pct = computePct(completed, planned)
            const isToday = day === todayIso
            const barColor = pct === 100 ? '#22C55E' : isToday ? '#2563EB' : '#CBD5E1'
            const barHeight = Math.max(4, (pct / 100) * 48)

            return (
              <div
                key={day}
                data-testid="daily-progress-row"
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: 48,
                    background: '#F4F4F1',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'flex-end',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    data-testid="daily-progress-bar"
                    style={{
                      width: '100%',
                      height: `${barHeight}px`,
                      background: barColor,
                      borderRadius: 4,
                      transition: 'height 0.3s',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: isToday ? '#2563EB' : '#B0ADA8',
                  }}
                >
                  {getDayShort(day)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Racha + % ── */}
      <div
        style={{
          ...cardStyle,
          display: 'flex',
          gap: 0,
          padding: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            flex: 1,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            borderRight: '1px solid #ECEAE6',
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>🔥</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E' }}>{streak} días</span>
          <span style={{ fontSize: 11, color: '#B0ADA8' }}>racha</span>
        </div>
        <div
          style={{
            flex: 1,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>📈</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E' }}>{weekPct}%</span>
          <span style={{ fontSize: 11, color: '#B0ADA8' }}>esta semana</span>
        </div>
      </div>

      {/* ── Horas por categoría ── */}
      {catHours.length > 0 && (
        <div style={cardStyle}>
          <p style={sectionTitleStyle}>Horas por categoría</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {catHours.map(({ cat, completed, planned }) => {
              const plannedWidth = (planned / maxHours) * 100
              const completedWidth = (completed / maxHours) * 100
              return (
                <div
                  key={cat.id}
                  data-testid="category-bar"
                  style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#1C1C1E', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {cat.icon && <span>{getIconDisplay(cat.icon)}</span>}
                      <span style={{ fontWeight: 500 }}>{cat.name}</span>
                    </span>
                    <span style={{ fontSize: 11, color: '#B0ADA8' }}>
                      {completed > 0
                        ? `${fmtHours(completed * 60)} / ${fmtHours(planned * 60)}`
                        : fmtHours(planned * 60)}
                    </span>
                  </div>
                  {/* Track: planned (light) with completed (solid) overlaid */}
                  <div style={{ position: 'relative', height: 6, borderRadius: 3, background: '#F4F4F1' }}>
                    {/* Planned bar (light) */}
                    <div
                      data-testid="category-bar"
                      style={{
                        position: 'absolute', top: 0, left: 0,
                        height: '100%',
                        width: `${plannedWidth}%`,
                        background: `${cat.color}40`,
                        borderRadius: 3,
                        transition: 'width 0.3s',
                      }}
                    />
                    {/* Completed bar (solid) */}
                    <div
                      data-testid="category-bar-fill"
                      style={{
                        position: 'absolute', top: 0, left: 0,
                        height: '100%',
                        width: `${completedWidth}%`,
                        background: cat.color,
                        borderRadius: 3,
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Mi dinero 💵 ── */}
      {finances && (() => {
        const { salary, payFrequency, currency, totalFixed, weekVariable } = finances
        const weeklyBudget = Math.round(salary / 4.33)
        const weeklyFixed = Math.round(totalFixed / 4.33)
        const available = weeklyBudget - weeklyFixed - weekVariable

        return (
          <div style={cardStyle}>
            <p style={sectionTitleStyle}>💵 Mi dinero</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <MoneyRow label="Presupuesto semana" cents={weeklyBudget} sign="+" currency={currency} />
              <MoneyRow label="Gastos fijos" cents={weeklyFixed} sign="-" currency={currency} color="#E74C3C" />
              <MoneyRow label="Gastos variables" cents={weekVariable} sign="-" currency={currency} color="#E74C3C" />
              <div style={{ borderTop: '1px solid #ECEAE6', paddingTop: 8, marginTop: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#1C1C1E', fontWeight: 600 }}>Disponible</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: available >= 0 ? '#22C55E' : '#E74C3C',
                    }}
                  >
                    {fmtMoneySidebar(available, currency)} {available >= 0 ? '✅' : '⚠️'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Tip ── */}
      <div
        style={{
          borderRadius: 12,
          background: '#EFF6FF',
          border: '1px solid #BED5F7',
          padding: '12px 14px',
        }}
      >
        <p style={{ fontSize: 12, color: '#2563EB', margin: 0, lineHeight: 1.5 }}>
          💡 <strong>Tip:</strong> Hacé clic en el botón <strong>+ Añadir</strong> en cualquier columna para agregar una actividad a ese día.
        </p>
      </div>
    </aside>
  )
}

function MoneyRow({
  label,
  cents,
  sign,
  currency = 'USD',
  color = '#1C1C1E',
}: {
  label: string
  cents: number
  sign: '+' | '-'
  currency?: string
  color?: string
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: '#666' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>
        {sign} {fmtMoneySidebar(cents, currency)}
      </span>
    </div>
  )
}
