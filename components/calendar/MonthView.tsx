'use client'

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DAY_HEADERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function dateToWeekId(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  const year = d.getUTCFullYear()
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow = jan4.getUTCDay() || 7
  const week1Mon = new Date(jan4)
  week1Mon.setUTCDate(jan4.getUTCDate() - (dow - 1))
  const diffMs = d.getTime() - week1Mon.getTime()
  const week = Math.floor(diffMs / (7 * 86400000)) + 1
  return `${year}-W${String(week).padStart(2, '0')}`
}

function shiftMonth(monthId: string, delta: number): string {
  const [y, m] = monthId.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1 + delta, 1))
  const ny = date.getUTCFullYear()
  const nm = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${ny}-${nm}`
}

function getBarColor(pct: number): string {
  if (pct === 0) return '#E5E7EB'
  if (pct < 50) return '#FCA5A5'
  if (pct < 80) return '#FCD34D'
  if (pct < 100) return '#86EFAC'
  return '#22C55E'
}

interface MonthFinances {
  salary: number
  currency: string
  totalFixed: number
  totalVariable: number
  totalExtra: number
}

interface MonthViewProps {
  monthId: string
  dayStats: Record<string, { plannedMin: number; completedMin: number }>
  todayIso: string
  monthFinances?: MonthFinances | null
  monthLabel?: string
}

function fmtMoney(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function MonthView({ monthId, dayStats, todayIso, monthFinances, monthLabel }: MonthViewProps) {
  const [year, month] = monthId.split('-').map(Number)

  // Build calendar grid: rows of 7 days (Mon–Sun)
  // First day of month
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1))
  // ISO day of week: Mon=1 … Sun=7
  const firstDow = firstOfMonth.getUTCDay() || 7

  // Last day of month
  const lastOfMonth = new Date(Date.UTC(year, month, 0))
  const daysInMonth = lastOfMonth.getUTCDate()

  // Padding before: days from previous month to fill the first row
  const leadingDays = firstDow - 1

  // Total cells needed (multiple of 7)
  const totalCells = Math.ceil((leadingDays + daysInMonth) / 7) * 7

  const cells: Array<{ isoDate: string; inMonth: boolean }> = []
  for (let i = 0; i < totalCells; i++) {
    const dayOffset = i - leadingDays + 1
    const date = new Date(Date.UTC(year, month - 1, dayOffset))
    cells.push({
      isoDate: date.toISOString().slice(0, 10),
      inMonth: date.getUTCMonth() === month - 1,
    })
  }

  const prevMonth = shiftMonth(monthId, -1)
  const nextMonth = shiftMonth(monthId, 1)
  const todayWeekId = dateToWeekId(todayIso)
  const monthLabelLocal = monthLabel ?? `${MONTHS_ES[month - 1]} ${year}`

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#F4F4F1',
        fontFamily: 'var(--font-plus-jakarta-sans, sans-serif)',
      }}
    >
      {/* Header */}
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
            onClick={() => { window.location.href = `/week/${todayWeekId}` }}
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
            onClick={() => { window.location.href = `/week/${todayWeekId}` }}
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
            Semana
          </button>
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
            Mes
          </button>
        </div>

        {/* Month navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => { window.location.href = `/month/${prevMonth}` }}
            aria-label="Previous month"
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
            style={{
              fontSize: '13px', fontWeight: 500, color: '#1C1C1E',
              minWidth: 110, textAlign: 'center',
            }}
          >
            {monthLabelLocal}
          </span>

          <button
            onClick={() => { window.location.href = `/month/${nextMonth}` }}
            aria-label="Next month"
            style={{
              width: 28, height: 28, borderRadius: 6,
              border: '1px solid #ECEAE6', background: '#fff',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: '#1C1C1E',
            }}
          >
            ›
          </button>
        </div>
      </header>

      {/* Calendar body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {/* Day headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 4,
            marginBottom: 4,
          }}
        >
          {DAY_HEADERS.map((d) => (
            <div
              key={d}
              style={{
                textAlign: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: '#B0ADA8',
                padding: '4px 0',
                letterSpacing: '0.05em',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 4,
          }}
        >
          {cells.map(({ isoDate, inMonth }) => {
            const isToday = isoDate === todayIso
            const stats = inMonth ? (dayStats[isoDate] ?? null) : null
            const hasPlan = stats !== null && stats.plannedMin > 0
            const pct = hasPlan ? Math.min(100, Math.round((stats!.completedMin / stats!.plannedMin) * 100)) : 0
            const barFillColor = hasPlan ? getBarColor(pct) : '#E5E7EB'
            const dayNum = parseInt(isoDate.slice(8, 10), 10)

            return (
              <div
                key={isoDate}
                onClick={() => {
                  window.location.href = `/week/${dateToWeekId(isoDate)}`
                }}
                style={{
                  position: 'relative',
                  border: isToday ? '1.5px solid #BED5F7' : '1px solid #ECEAE6',
                  borderRadius: 8,
                  minHeight: 72,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  background: '#ffffff',
                  transition: 'box-shadow 0.1s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
                }}
              >
                {/* Vertical fill — rises from bottom */}
                {inMonth && hasPlan && pct > 0 && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0, left: 0, right: 0,
                    height: `${pct}%`,
                    background: `${barFillColor}55`,
                    transition: 'height 0.3s ease',
                  }} />
                )}

                {/* Content on top of fill */}
                <div style={{
                  position: 'relative',
                  zIndex: 1,
                  padding: '6px 8px 6px',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}>
                  {/* Day number */}
                  <span style={{
                    fontSize: 11,
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? '#2563EB' : inMonth ? '#6B7280' : '#D1D5DB',
                    lineHeight: 1,
                  }}>
                    {dayNum}
                  </span>

                  {/* Percentage */}
                  {inMonth && hasPlan && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: pct === 100 ? '#16A34A' : pct >= 50 ? '#D97706' : '#6B7280',
                      lineHeight: 1,
                      alignSelf: 'flex-end',
                    }}>
                      {pct}%
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Resumen financiero del mes ── */}
        {monthFinances && (() => {
          const { salary, currency, totalFixed, totalVariable, totalExtra } = monthFinances
          const totalIncome = salary + totalExtra
          const available = totalIncome - totalFixed - totalVariable
          return (
            <div style={{
              marginTop: 12,
            background: 'white',
            borderRadius: 12,
            padding: '16px 20px',
            border: '1px solid #ECEAE6',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
          }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#B0ADA8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                💰 Ingreso {monthLabelLocal}
              </p>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#1C1C1E', margin: 0 }}>
                {fmtMoney(totalIncome, currency)}
              </p>
              {totalExtra > 0 && (
                <p style={{ fontSize: 10, color: '#22C55E', margin: '2px 0 0' }}>+{fmtMoney(totalExtra, currency)} extra</p>
              )}
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#B0ADA8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                📋 Gastos fijos
              </p>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#E74C3C', margin: 0 }}>
                -{fmtMoney(totalFixed, currency)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#B0ADA8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                💸 Gastos variables
              </p>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#E74C3C', margin: 0 }}>
                -{fmtMoney(totalVariable, currency)}
              </p>
            </div>
            <div style={{
              borderLeft: '1px solid #ECEAE6',
              paddingLeft: 16,
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#B0ADA8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                ✅ Disponible
              </p>
              <p style={{ fontSize: 16, fontWeight: 800, color: available >= 0 ? '#22C55E' : '#E74C3C', margin: 0 }}>
                {fmtMoney(available, currency)}
              </p>
              <p style={{ fontSize: 10, color: '#B0ADA8', margin: '2px 0 0' }}>
                {available >= 0 ? 'para ahorrar' : 'déficit'}
              </p>
            </div>
            </div>
          )
        })()}

        {/* ── Tips ── */}
        {monthFinances && (() => {
          const { salary, currency, totalFixed, totalVariable, totalExtra } = monthFinances
          const available = salary + totalExtra - totalFixed - totalVariable
          if (available <= 0) return (
            <div style={{
              marginTop: 10, padding: '12px 16px', borderRadius: 12,
              background: '#FFF1F2', border: '1px solid #FECDD3',
              fontSize: 13, color: '#BE123C', lineHeight: 1.6,
            }}>
              ⚠️ <strong>Ojo con los gastos este mes.</strong> Estás gastando más de lo que ingresás. Revisá tus gastos variables — ahí suele estar el problema.
            </div>
          )

          const dollars = available / 100
          const dailyCents = Math.round(available / 30)

          return (
            <div style={{
              marginTop: 10, padding: '12px 16px', borderRadius: 12,
              background: '#F0FDF4', border: '1px solid #86EFAC',
              fontSize: 13, color: '#15803D', lineHeight: 1.7,
            }}>
              💡 <strong>En teoría,</strong> con los gastos que estás teniendo este mes te quedan libres{' '}
              <strong>{fmtMoney(available, currency)}</strong>. Podés ahorrarlo o — si te ponés creativo —{' '}
              podés gastar <strong>{fmtMoney(dailyCents, currency)} diarios</strong> en antojitos. 😄👍
            </div>
          )
        })()}
      </div>
    </div>
  )
}
