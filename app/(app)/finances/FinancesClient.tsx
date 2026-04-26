'use client'

import { useState, useCallback } from 'react'
import {
  upsertUserFinances,
  createFixedExpense,
  updateFixedExpense,
  deleteFixedExpense,
  createVariableExpense,
  deleteVariableExpense,
  createExtraIncome,
  deleteExtraIncome,
} from '@/actions/finances'
import type { UserFinances, FixedExpense, VariableExpense, ExtraIncome } from '@/actions/finances'

// ── Design tokens ──────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 12,
  padding: 16,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#B0ADA8',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: 12,
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #ECEAE6',
  fontSize: 13,
  color: '#1C1C1E',
  outline: 'none',
  fontFamily: 'inherit',
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: 8,
  border: 'none',
  background: '#1C1C1E',
  color: 'white',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

// ── Formatters ─────────────────────────────────────────────────────────────

function centsToDisplay(cents: number): string {
  return (cents / 100).toFixed(2)
}

function displayToCents(str: string): number {
  return Math.round(parseFloat(str.replace(',', '.')) * 100) || 0
}

function fmtMoney(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function fmtDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${months[m - 1]} ${d}`
}

function getQuincena(iso: string): 'primera' | 'segunda' {
  const day = parseInt(iso.split('-')[2], 10)
  return day <= 15 ? 'primera' : 'segunda'
}

// ── Predefined quick-add suggestions ──────────────────────────────────────

const SUGGESTIONS = [
  { icon: '🏠', name: 'Arriendo' },
  { icon: '💡', name: 'Luz' },
  { icon: '💧', name: 'Agua' },
  { icon: '🔥', name: 'Gas' },
  { icon: '🏋️', name: 'Gym' },
  { icon: '💳', name: 'Tarjeta crédito' },
  { icon: '🚌', name: 'Transporte' },
]

// ── Nav tabs shared component ──────────────────────────────────────────────

function NavTabs({ active }: { active: 'schedule' | 'finances' }) {
  return (
    <div
      style={{
        background: '#F4F4F1',
        borderRadius: 8,
        padding: 3,
        display: 'flex',
      }}
    >
      <button
        onClick={() => { window.location.href = '/week/' + getCurrentWeekId() }}
        style={{
          background: active === 'schedule' ? '#1C1C1E' : 'transparent',
          color: active === 'schedule' ? 'white' : '#B0ADA8',
          borderRadius: 6,
          padding: '4px 12px',
          fontSize: 12,
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Horario Semanal
      </button>
      <button
        onClick={() => { window.location.href = '/finances' }}
        style={{
          background: active === 'finances' ? '#1C1C1E' : 'transparent',
          color: active === 'finances' ? 'white' : '#B0ADA8',
          borderRadius: 6,
          padding: '4px 12px',
          fontSize: 12,
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Manejo del dinero
      </button>
    </div>
  )
}

function getCurrentWeekId(): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow = jan4.getUTCDay() || 7
  const week1Mon = new Date(jan4)
  week1Mon.setUTCDate(jan4.getUTCDate() - (dow - 1))
  const diffMs = now.getTime() - week1Mon.getTime()
  const week = Math.floor(diffMs / (7 * 86400000)) + 1
  return `${year}-W${String(week).padStart(2, '0')}`
}

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  userId: string
  initialFinances: UserFinances | null
  initialFixed: FixedExpense[]
  initialVariable: VariableExpense[]
  initialExtraIncome: ExtraIncome[]
  currentMonthLabel: string
}

// ── Main component ─────────────────────────────────────────────────────────

export function FinancesClient({
  userId,
  initialFinances,
  initialFixed,
  initialVariable,
  initialExtraIncome,
  currentMonthLabel,
}: Props) {
  // ── Salary state ──
  const [salary, setSalary] = useState(
    initialFinances ? centsToDisplay(initialFinances.salary) : ''
  )
  const [payFrequency, setPayFrequency] = useState(
    initialFinances?.payFrequency ?? 'monthly'
  )
  const [currency] = useState(initialFinances?.currency ?? 'USD')
  const [salaryLoading, setSalaryLoading] = useState(false)
  const [salarySaved, setSalarySaved] = useState(false)

  // ── Fixed expenses state ──
  const [fixed, setFixed] = useState<FixedExpense[]>(initialFixed)
  const [customName, setCustomName] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  // ── Extra income state ──
  const [extraIncome, setExtraIncome] = useState<ExtraIncome[]>(initialExtraIncome)
  const [newExtraDate, setNewExtraDate] = useState(new Date().toISOString().slice(0, 10))
  const [newExtraDesc, setNewExtraDesc] = useState('')
  const [newExtraAmount, setNewExtraAmount] = useState('')
  const [showExtraForm, setShowExtraForm] = useState(false)
  const [extraLoading, setExtraLoading] = useState(false)

  // ── Variable expenses state ──
  const [variable, setVariable] = useState<VariableExpense[]>(initialVariable)
  const [newVarDate, setNewVarDate] = useState(new Date().toISOString().slice(0, 10))
  const [newVarDesc, setNewVarDesc] = useState('')
  const [newVarAmount, setNewVarAmount] = useState('')
  const [showVarForm, setShowVarForm] = useState(false)
  const [varLoading, setVarLoading] = useState(false)
  const [varQuincenaFilter, setVarQuincenaFilter] = useState<'all' | 'primera' | 'segunda'>('all')

  // ── Salary save ──
  const handleSaveSalary = useCallback(async () => {
    setSalaryLoading(true)
    try {
      await upsertUserFinances(userId, {
        salary: displayToCents(salary),
        payFrequency,
        currency,
      })
      setSalarySaved(true)
      setTimeout(() => setSalarySaved(false), 2000)
    } finally {
      setSalaryLoading(false)
    }
  }, [salary, payFrequency, currency, userId])

  // ── Fixed expense helpers ──
  const handleAddSuggestion = useCallback(async (icon: string, name: string) => {
    const id = crypto.randomUUID()
    const newExp: FixedExpense = { id, userId, name, icon, monthlyAmount: 0, quincena: null, createdAt: null }
    setFixed((prev) => [...prev, newExp])
    await createFixedExpense({ id, userId, name, icon, monthlyAmount: 0 })
  }, [userId])

  const handleAddCustom = useCallback(async () => {
    const trimmed = customName.trim()
    if (!trimmed) return
    const id = crypto.randomUUID()
    const newExp: FixedExpense = { id, userId, name: trimmed, icon: '💸', monthlyAmount: 0, quincena: null, createdAt: null }
    setFixed((prev) => [...prev, newExp])
    setCustomName('')
    setShowCustomInput(false)
    await createFixedExpense({ id, userId, name: trimmed, icon: '💸', monthlyAmount: 0 })
  }, [customName, userId])

  const handleFixedAmountChange = useCallback(async (id: string, displayVal: string) => {
    const cents = displayToCents(displayVal)
    setFixed((prev) => prev.map((e) => e.id === id ? { ...e, monthlyAmount: cents } : e))
    await updateFixedExpense(id, { monthlyAmount: cents })
  }, [])

  const handleDeleteFixed = useCallback(async (id: string) => {
    setFixed((prev) => prev.filter((e) => e.id !== id))
    await deleteFixedExpense(id)
  }, [])

  // ── Variable expense helpers ──
  const handleAddVariable = useCallback(async () => {
    if (!newVarDesc.trim() || !newVarAmount) return
    setVarLoading(true)
    try {
      const id = crypto.randomUUID()
      const cents = displayToCents(newVarAmount)
      const newExp: VariableExpense = {
        id, userId, date: newVarDate, amount: cents, description: newVarDesc.trim(), createdAt: null,
      }
      setVariable((prev) => [newExp, ...prev])
      await createVariableExpense({ id, userId, date: newVarDate, amount: cents, description: newVarDesc.trim() })
      setNewVarDesc('')
      setNewVarAmount('')
      setShowVarForm(false)
    } finally {
      setVarLoading(false)
    }
  }, [newVarDesc, newVarAmount, newVarDate, userId])

  const handleDeleteVariable = useCallback(async (id: string) => {
    setVariable((prev) => prev.filter((e) => e.id !== id))
    await deleteVariableExpense(id)
  }, [])

  // ── Extra income handlers ──
  const handleAddExtra = useCallback(async () => {
    if (!newExtraDesc.trim() || !newExtraAmount) return
    setExtraLoading(true)
    try {
      const id = crypto.randomUUID()
      const amount = displayToCents(newExtraAmount)
      const entry: ExtraIncome = { id, userId, date: newExtraDate, amount, description: newExtraDesc.trim(), createdAt: null }
      setExtraIncome(prev => [entry, ...prev])
      setNewExtraDesc('')
      setNewExtraAmount('')
      setShowExtraForm(false)
      await createExtraIncome({ id, userId, date: newExtraDate, amount, description: entry.description })
    } finally {
      setExtraLoading(false)
    }
  }, [newExtraDesc, newExtraAmount, newExtraDate, userId])

  const handleDeleteExtra = useCallback(async (id: string) => {
    setExtraIncome(prev => prev.filter(e => e.id !== id))
    await deleteExtraIncome(id)
  }, [])

  // ── Balance calculations ──
  const salaryCents = displayToCents(salary)
  const totalExtraIncome = extraIncome.reduce((s, e) => s + e.amount, 0)
  const totalFixed = fixed.reduce((acc, e) => acc + e.monthlyAmount, 0)
  const totalVariable = variable.reduce((acc, e) => acc + e.amount, 0)
  const available = salaryCents + totalExtraIncome - totalFixed - totalVariable

  // Per-period breakdowns
  const biweeklyIncome = Math.round(salaryCents / 2)
  const biweeklyFixed = Math.round(totalFixed / 2)
  const biweeklyVariable = Math.round(totalVariable / 2)
  const biweeklyAvailable = biweeklyIncome - biweeklyFixed - biweeklyVariable

  const weeklyIncome = Math.round(salaryCents / 4.33)
  const weeklyFixed = Math.round(totalFixed / 4.33)
  const weeklyVariable = Math.round(totalVariable / 4.33)
  const weeklyAvailable = weeklyIncome - weeklyFixed - weeklyVariable

  // Quincena breakdowns (based on tagged fixed expenses)
  const primeraFixed = fixed.filter(e => e.quincena === 'primera' || e.quincena === 'ambas').reduce((s, e) => s + e.monthlyAmount, 0)
  const segundaFixed = fixed.filter(e => e.quincena === 'segunda' || e.quincena === 'ambas').reduce((s, e) => s + e.monthlyAmount, 0)
  const primeraVariable = variable.filter(e => getQuincena(e.date) === 'primera').reduce((s, e) => s + e.amount, 0)
  const segundaVariable = variable.filter(e => getQuincena(e.date) === 'segunda').reduce((s, e) => s + e.amount, 0)
  const primeraExtra = extraIncome.filter(e => getQuincena(e.date) === 'primera').reduce((s, e) => s + e.amount, 0)
  const segundaExtra = extraIncome.filter(e => getQuincena(e.date) === 'segunda').reduce((s, e) => s + e.amount, 0)
  const primeraAvailable = biweeklyIncome + primeraExtra - primeraFixed - primeraVariable
  const segundaAvailable = biweeklyIncome + segundaExtra - segundaFixed - segundaVariable

  // ── Suggestions not yet added ──
  const existingNames = new Set(fixed.map((e) => e.name))
  const remainingSuggestions = SUGGESTIONS.filter((s) => !existingNames.has(s.name))

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#F4F4F1',
        fontFamily: 'var(--font-plus-jakarta-sans, sans-serif)',
        overflow: 'hidden',
      }}
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
        <NavTabs active="finances" />
      </header>

      {/* ── Page body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div
          style={{
            maxWidth: 780,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
          }}
        >
          {/* ── A. Salary Setup ── */}
          <div style={cardStyle}>
            <p style={sectionTitleStyle}>💰 Tu ingreso</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: '#B0ADA8', display: 'block', marginBottom: 4 }}>
                  Salario mensual
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, color: '#B0ADA8' }}>$</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="0.00"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#B0ADA8', display: 'block', marginBottom: 4 }}>
                  Me pagan
                </label>
                <select
                  value={payFrequency}
                  onChange={(e) => setPayFrequency(e.target.value)}
                  style={{ ...inputStyle, width: '100%', background: 'white' }}
                >
                  <option value="monthly">Mensual</option>
                  <option value="biweekly">Quincenal</option>
                  <option value="weekly">Semanal</option>
                </select>
              </div>
              <button
                onClick={handleSaveSalary}
                disabled={salaryLoading}
                style={{
                  ...btnPrimary,
                  opacity: salaryLoading ? 0.6 : 1,
                  background: salarySaved ? '#22C55E' : '#1C1C1E',
                }}
              >
                {salarySaved ? '¡Guardado!' : salaryLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>

            {/* ── Ingresos extra ── */}
            <div style={{ borderTop: '1px solid #ECEAE6', paddingTop: 14, marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#B0ADA8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  💸 Ingresos extra
                </span>
                <button
                  onClick={() => setShowExtraForm(v => !v)}
                  style={{ ...btnPrimary, padding: '4px 12px', fontSize: 12 }}
                >
                  + Agregar
                </button>
              </div>

              {showExtraForm && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  <input type="date" value={newExtraDate} onChange={e => setNewExtraDate(e.target.value)}
                    style={{ ...inputStyle, width: 130 }} />
                  <input placeholder="Descripción" value={newExtraDesc} onChange={e => setNewExtraDesc(e.target.value)}
                    style={{ ...inputStyle, flex: 1, minWidth: 120 }} />
                  <input type="number" placeholder="0.00" value={newExtraAmount} onChange={e => setNewExtraAmount(e.target.value)}
                    style={{ ...inputStyle, width: 90 }} />
                  <button onClick={handleAddExtra} disabled={extraLoading || !newExtraDesc.trim() || !newExtraAmount}
                    style={{ ...btnPrimary, opacity: extraLoading ? 0.6 : 1, background: '#22C55E' }}>
                    ✓
                  </button>
                </div>
              )}

              {extraIncome.length === 0 && !showExtraForm && (
                <p style={{ fontSize: 12, color: '#B0ADA8', textAlign: 'center', padding: '8px 0' }}>
                  Sin ingresos extra este mes
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {extraIncome.map(e => {
                  const q = getQuincena(e.date)
                  return (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: '1px solid #F4F4F1' }}>
                      <span style={{ fontSize: 11, color: '#B0ADA8', flexShrink: 0 }}>{fmtDate(e.date)}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 10, flexShrink: 0,
                        background: q === 'primera' ? '#EFF6FF' : '#FFF7ED',
                        color: q === 'primera' ? '#2563EB' : '#EA580C',
                      }}>
                        {q === 'primera' ? '1ra Q' : '2da Q'}
                      </span>
                      <span style={{ fontSize: 13, color: '#1C1C1E', flex: 1 }}>{e.description}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#22C55E' }}>+{fmtMoney(e.amount, currency)}</span>
                      <button onClick={() => handleDeleteExtra(e.id)}
                        style={{ background: 'none', border: 'none', fontSize: 11, color: '#CBCBC8', cursor: 'pointer' }}
                        onMouseEnter={ev => (ev.currentTarget.style.color = '#E74C3C')}
                        onMouseLeave={ev => (ev.currentTarget.style.color = '#CBCBC8')}>✕</button>
                    </div>
                  )
                })}
                {extraIncome.length > 0 && (
                  <div style={{ borderTop: '1px solid #ECEAE6', paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1C1C1E' }}>Total extra</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#22C55E' }}>+{fmtMoney(totalExtraIncome, currency)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── D. Balance Summary ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Monthly — always shown */}
            <BalanceCard
              title="📊 Balance mensual"
              income={salaryCents + totalExtraIncome}
              fixed={totalFixed}
              variable={totalVariable}
              available={available}
              currency={currency}
              cardStyle={cardStyle}
              note={totalExtraIncome > 0 ? `incluye ${fmtMoney(totalExtraIncome, currency)} extra` : undefined}
            />
            {/* Quincena breakdowns — always shown */}
            {(() => {
              const todayQ = getQuincena(new Date().toISOString().slice(0, 10))
              return (
                <>
                  <BalanceCard
                    title="🗓️ 1ra quincena (días 1–15)"
                    income={biweeklyIncome + primeraExtra}
                    fixed={primeraFixed}
                    variable={primeraVariable}
                    available={primeraAvailable}
                    currency={currency}
                    cardStyle={cardStyle}
                    highlighted={todayQ === 'primera'}
                    note={primeraExtra > 0 ? `+${fmtMoney(primeraExtra, currency)} extra` : undefined}
                  />
                  <BalanceCard
                    title="🗓️ 2da quincena (días 16–31)"
                    income={biweeklyIncome + segundaExtra}
                    fixed={segundaFixed}
                    variable={segundaVariable}
                    available={segundaAvailable}
                    currency={currency}
                    cardStyle={cardStyle}
                    highlighted={todayQ === 'segunda'}
                    note={segundaExtra > 0 ? `+${fmtMoney(segundaExtra, currency)} extra` : undefined}
                  />
                </>
              )
            })()}
            {/* Weekly — only when payFrequency is weekly */}
            {payFrequency === 'weekly' && (
              <BalanceCard
                title="📊 Balance semanal"
                income={weeklyIncome}
                fixed={weeklyFixed}
                variable={weeklyVariable}
                available={weeklyAvailable}
                currency={currency}
                cardStyle={cardStyle}
                note="≈ salario / 4.33"
              />
            )}
          </div>

          {/* ── E. Monthly Summary ── */}
          <div style={{
            gridColumn: '1 / -1',
            borderRadius: 12,
            padding: '20px 24px',
            background: available >= 0
              ? 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)'
              : 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
            border: `1.5px solid ${available >= 0 ? '#86EFAC' : '#FECDD3'}`,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: available >= 0 ? '#16A34A' : '#E11D48', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
              {available >= 0 ? '✅ Resumen del mes' : '⚠️ Resumen del mes'}
            </p>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#1C1C1E', lineHeight: 1.4, marginBottom: 8 }}>
              Tu balance de <span style={{ color: available >= 0 ? '#16A34A' : '#E11D48' }}>{currentMonthLabel}</span> fue de{' '}
              <span style={{ color: available >= 0 ? '#16A34A' : '#E11D48' }}>
                {fmtMoney(salaryCents + totalExtraIncome, currency)}
              </span>
            </p>
            <p style={{ fontSize: 15, color: '#555', lineHeight: 1.6, margin: 0 }}>
              Gastos totales:{' '}
              <strong style={{ color: '#E74C3C' }}>-{fmtMoney(totalFixed + totalVariable, currency)}</strong>
              {totalExtraIncome > 0 && (
                <> · Ingresos extra: <strong style={{ color: '#22C55E' }}>+{fmtMoney(totalExtraIncome, currency)}</strong></>
              )}
              <br />
              {available >= 0
                ? <>Te quedaron <strong style={{ fontSize: 18, color: '#16A34A' }}>{fmtMoney(available, currency)}</strong> libres para ahorrar. 🎉</>
                : <>Gastaste <strong style={{ fontSize: 18, color: '#E11D48' }}>{fmtMoney(Math.abs(available), currency)}</strong> más de lo que ingresaste este mes. 📉</>
              }
            </p>
          </div>

          {/* ── B. Fixed Expenses ── */}
          <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
            <p style={sectionTitleStyle}>📋 Gastos fijos mensuales</p>

            {/* Quick-add chips (only when there are still suggestions) */}
            {remainingSuggestions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {remainingSuggestions.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => handleAddSuggestion(s.icon, s.name)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 20,
                      border: '1.5px dashed #CBCBC8',
                      background: 'transparent',
                      fontSize: 12,
                      color: '#666',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {s.icon} {s.name}
                  </button>
                ))}
                {/* Custom expense input */}
                {showCustomInput ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      autoFocus
                      placeholder="Nombre del gasto"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustom() }}
                      style={{ ...inputStyle, fontSize: 12, padding: '4px 10px' }}
                    />
                    <button
                      onClick={handleAddCustom}
                      style={{ ...btnPrimary, padding: '4px 10px', fontSize: 12 }}
                    >
                      Agregar
                    </button>
                    <button
                      onClick={() => { setShowCustomInput(false); setCustomName('') }}
                      style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid #ECEAE6', background: 'white', fontSize: 12, cursor: 'pointer', color: '#666' }}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCustomInput(true)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 20,
                      border: '1.5px dashed #2563EB',
                      background: 'transparent',
                      fontSize: 12,
                      color: '#2563EB',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    + Otro
                  </button>
                )}
              </div>
            )}

            {/* Expense rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {fixed.map((exp) => (
                <FixedExpenseRow
                  key={exp.id}
                  expense={exp}
                  onAmountChange={(val) => handleFixedAmountChange(exp.id, val)}
                  onQuincenaChange={(q) => {
                    setFixed(prev => prev.map(e => e.id === exp.id ? { ...e, quincena: q } : e))
                    updateFixedExpense(exp.id, { quincena: q })
                  }}
                  onDelete={() => handleDeleteFixed(exp.id)}
                />
              ))}
              {fixed.length === 0 && (
                <p style={{ fontSize: 13, color: '#B0ADA8', textAlign: 'center', padding: '12px 0' }}>
                  Usá los chips de arriba para agregar tus gastos fijos.
                </p>
              )}
            </div>

            {fixed.length > 0 && (
              <div style={{ borderTop: '1px solid #ECEAE6', paddingTop: 10, marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1E' }}>Total</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#E74C3C' }}>
                    {fmtMoney(totalFixed, currency)}/mes
                  </span>
                </div>
              </div>
            )}

            {/* + Agregar custom when all suggestions are used */}
            {remainingSuggestions.length === 0 && !showCustomInput && (
              <button
                onClick={() => setShowCustomInput(true)}
                style={{
                  marginTop: 10,
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: '1.5px dashed #CBCBC8',
                  background: 'transparent',
                  fontSize: 12,
                  color: '#666',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                + Agregar gasto fijo
              </button>
            )}
          </div>

          {/* ── C. Variable Expenses ── */}
          <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ ...sectionTitleStyle, marginBottom: 0 }}>
                💸 Gastos variables — {currentMonthLabel}
              </p>
              <button
                onClick={() => setShowVarForm((v) => !v)}
                style={{
                  ...btnPrimary,
                  padding: '6px 14px',
                  fontSize: 12,
                }}
              >
                + Agregar gasto
              </button>
            </div>

            {/* Add form */}
            {showVarForm && (
              <div
                style={{
                  background: '#F8F8F6',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                  alignItems: 'flex-end',
                }}
              >
                <div>
                  <label style={{ fontSize: 11, color: '#B0ADA8', display: 'block', marginBottom: 3 }}>Fecha</label>
                  <input
                    type="date"
                    value={newVarDate}
                    onChange={(e) => setNewVarDate(e.target.value)}
                    style={{ ...inputStyle, fontSize: 12 }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ fontSize: 11, color: '#B0ADA8', display: 'block', marginBottom: 3 }}>Descripción</label>
                  <input
                    placeholder="Ej: Supermercado"
                    value={newVarDesc}
                    onChange={(e) => setNewVarDesc(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddVariable() }}
                    style={{ ...inputStyle, width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#B0ADA8', display: 'block', marginBottom: 3 }}>Monto $</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0.00"
                    value={newVarAmount}
                    onChange={(e) => setNewVarAmount(e.target.value)}
                    style={{ ...inputStyle, width: 100 }}
                  />
                </div>
                <button
                  onClick={handleAddVariable}
                  disabled={varLoading || !newVarDesc.trim() || !newVarAmount}
                  style={{ ...btnPrimary, opacity: varLoading ? 0.6 : 1 }}
                >
                  {varLoading ? '...' : 'Agregar'}
                </button>
                <button
                  onClick={() => setShowVarForm(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid #ECEAE6',
                    background: 'white',
                    fontSize: 13,
                    cursor: 'pointer',
                    color: '#666',
                    fontFamily: 'inherit',
                  }}
                >
                  Cancelar
                </button>
              </div>
            )}

            {/* Quincena filter */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
              {(['all', 'primera', 'segunda'] as const).map(f => (
                <button key={f} onClick={() => setVarQuincenaFilter(f)} style={{
                  padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
                  background: varQuincenaFilter === f ? '#1C1C1E' : '#F4F4F1',
                  color: varQuincenaFilter === f ? 'white' : '#B0ADA8',
                }}>
                  {f === 'all' ? 'Todos' : f === 'primera' ? '1ra Q' : '2da Q'}
                </button>
              ))}
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {variable
                .filter(e => varQuincenaFilter === 'all' || getQuincena(e.date) === varQuincenaFilter)
                .map((exp) => {
                const q = getQuincena(exp.date)
                return (
                  <div key={exp.id} style={{
                    display: 'flex', alignItems: 'center',
                    padding: '6px 0', borderBottom: '1px solid #F4F4F1', gap: 6,
                  }}>
                    <span style={{ fontSize: 12, color: '#B0ADA8', minWidth: 52 }}>{fmtDate(exp.date)}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 10,
                      background: q === 'primera' ? '#EFF6FF' : '#FFF7ED',
                      color: q === 'primera' ? '#2563EB' : '#EA580C',
                      flexShrink: 0,
                    }}>
                      {q === 'primera' ? '1ra Q' : '2da Q'}
                    </span>
                    <span style={{ fontSize: 13, color: '#1C1C1E', flex: 1 }}>{exp.description}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#E74C3C' }}>
                      -{fmtMoney(exp.amount, currency)}
                    </span>
                    <button onClick={() => handleDeleteVariable(exp.id)}
                      style={{ background: 'none', border: 'none', fontSize: 12, color: '#CBCBC8', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#E74C3C')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#CBCBC8')}>✕</button>
                  </div>
                )
              })}
              {variable.length === 0 && (
                <p style={{ fontSize: 13, color: '#B0ADA8', textAlign: 'center', padding: '12px 0' }}>
                  Sin gastos variables este mes.
                </p>
              )}
            </div>

            {variable.length > 0 && (
              <div style={{ borderTop: '1px solid #ECEAE6', paddingTop: 10, marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1E' }}>Total este mes</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#E74C3C' }}>
                    -{fmtMoney(totalVariable, currency)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function BalanceCard({
  title, income, fixed, variable, available, currency, cardStyle, note, highlighted,
}: {
  title: string
  income: number
  fixed: number
  variable: number
  available: number
  currency: string
  cardStyle: React.CSSProperties
  note?: string
  highlighted?: boolean
}) {
  return (
    <div style={{
      ...cardStyle,
      ...(highlighted ? {
        border: '2px solid #2563EB',
        boxShadow: '0 0 0 3px rgba(37,99,235,0.1)',
      } : {}),
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#B0ADA8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
          {title}
        </p>
        {note && <span style={{ fontSize: 10, color: '#CBCBC8' }}>{note}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <BalanceRow label="Ingreso" cents={income} sign="+" color="#22C55E" />
        <BalanceRow label="Gastos fijos" cents={fixed} sign="-" color="#E74C3C" />
        <BalanceRow label="Gastos variables (est.)" cents={variable} sign="-" color="#E74C3C" />
        <div style={{ borderTop: '1px solid #ECEAE6', paddingTop: 8, marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1E' }}>Disponible</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: available >= 0 ? '#22C55E' : '#E74C3C' }}>
              {fmtMoney(available, currency)} {available >= 0 ? '✅' : '⚠️'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function BalanceRow({
  label,
  cents,
  sign,
  color,
}: {
  label: string
  cents: number
  sign: '+' | '-'
  color: string
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: '#666' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color }}>
        {sign} {fmtMoney(cents)}
      </span>
    </div>
  )
}

function FixedExpenseRow({
  expense,
  onAmountChange,
  onQuincenaChange,
  onDelete,
}: {
  expense: FixedExpense
  onAmountChange: (val: string) => void
  onQuincenaChange: (q: string | null) => void
  onDelete: () => void
}) {
  const [localVal, setLocalVal] = useState(
    expense.monthlyAmount > 0 ? centsToDisplay(expense.monthlyAmount) : ''
  )

  const qOptions: { label: string; value: string | null }[] = [
    { label: '1ra Q', value: 'primera' },
    { label: '2da Q', value: 'segunda' },
    { label: 'Ambas', value: 'ambas' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 8, borderBottom: '1px solid #F4F4F1' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16, width: 22, flexShrink: 0 }}>{expense.icon}</span>
        <span style={{ fontSize: 13, color: '#1C1C1E', flex: 1, fontWeight: 500 }}>{expense.name}</span>
        <span style={{ fontSize: 13, color: '#B0ADA8', flexShrink: 0 }}>$</span>
        <input
          type="number"
          min={0}
          placeholder="0.00"
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={() => onAmountChange(localVal)}
          style={{
            padding: '6px 10px', borderRadius: 8, border: '1px solid #ECEAE6',
            fontSize: 13, color: '#1C1C1E', width: 100, outline: 'none', fontFamily: 'inherit',
          }}
        />
        <button
          onClick={onDelete}
          style={{ background: 'none', border: 'none', fontSize: 12, color: '#CBCBC8', cursor: 'pointer', flexShrink: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#E74C3C')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#CBCBC8')}
        >✕</button>
      </div>

      {/* Quincena toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 30 }}>
        <span style={{ fontSize: 11, color: '#B0ADA8' }}>Pago:</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {qOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => onQuincenaChange(expense.quincena === opt.value ? null : opt.value)}
              style={{
                padding: '2px 8px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 10, fontWeight: 600, fontFamily: 'inherit',
                background: expense.quincena === opt.value ? '#1C1C1E' : '#F4F4F1',
                color: expense.quincena === opt.value ? 'white' : '#B0ADA8',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
          {expense.quincena && (
            <span style={{ fontSize: 10, color: '#B0ADA8', alignSelf: 'center', marginLeft: 2 }}>
              ({expense.quincena === 'primera' ? 'días 1–15' : expense.quincena === 'segunda' ? 'días 16–31' : 'días 1–31'})
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
