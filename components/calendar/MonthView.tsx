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

interface MonthViewProps {
  monthId: string
  dayStats: Record<string, { plannedMin: number; completedMin: number }>
  todayIso: string
}

export function MonthView({ monthId, dayStats, todayIso }: MonthViewProps) {
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
  const monthLabel = `${MONTHS_ES[month - 1]} ${year}`

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
            {monthLabel}
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
                  background: isToday ? '#F0F7FF' : '#ffffff',
                  border: isToday ? '1px solid #BED5F7' : '1px solid #ECEAE6',
                  borderRadius: 8,
                  padding: '6px 8px 8px',
                  minHeight: 72,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  transition: 'box-shadow 0.1s',
                }}
                onMouseEnter={e => {
                  if (!isToday) (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
                }}
              >
                {/* Day number */}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? '#2563EB' : inMonth ? '#6B7280' : '#D1D5DB',
                    lineHeight: 1,
                  }}
                >
                  {dayNum}
                </span>

                {/* Productivity bar — only for in-month days with planned activities */}
                {inMonth && hasPlan && (
                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Track */}
                    <div
                      style={{
                        width: '100%',
                        height: 5,
                        background: '#E5E7EB',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: barFillColor,
                          borderRadius: 3,
                          transition: 'width 0.2s',
                        }}
                      />
                    </div>
                    {/* Percentage text */}
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        color: '#9CA3AF',
                        lineHeight: 1,
                      }}
                    >
                      {pct}%
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
