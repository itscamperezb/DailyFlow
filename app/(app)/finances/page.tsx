import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase.server'
import { dbGetUserFinances, dbGetFixedExpenses, dbGetExtraIncome } from '@/actions/finances.db'
import { FinancesClient } from './FinancesClient'
import type { UserFinances, FixedExpense, ExtraIncome } from '@/actions/finances'

export default async function FinancesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const now = new Date()
  const fromDate = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`
  const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
  const toDate = lastDay.toISOString().slice(0, 10)

  const [finances, fixedExpensesRows, extraIncomeRows] = await Promise.all([
    dbGetUserFinances(user.id),
    dbGetFixedExpenses(user.id),
    dbGetExtraIncome(user.id, fromDate, toDate),
  ])

  const { data: varRows } = await supabase
    .from('variable_expenses')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', fromDate)
    .lte('date', toDate)

  const initialFinances: UserFinances | null = finances
    ? { id: finances.id, userId: finances.userId, salary: finances.salary, payFrequency: finances.payFrequency, currency: finances.currency, createdAt: finances.createdAt?.toISOString() ?? null }
    : null

  const initialFixed: FixedExpense[] = (fixedExpensesRows ?? []).map((r) => ({
    id: r.id, userId: r.userId, name: r.name, icon: r.icon,
    monthlyAmount: r.monthlyAmount, quincena: r.quincena ?? null,
    createdAt: r.createdAt?.toISOString() ?? null,
  }))

  const initialVariable = (varRows ?? []).map((r) => ({
    id: r.id, userId: r.user_id, date: r.date, amount: r.amount,
    description: r.description, createdAt: r.created_at ?? null,
  }))

  const initialExtraIncome: ExtraIncome[] = (extraIncomeRows ?? []).map((r) => ({
    id: r.id, userId: r.userId, date: r.date, amount: r.amount,
    description: r.description, createdAt: r.createdAt?.toISOString() ?? null,
  }))

  return (
    <FinancesClient
      userId={user.id}
      initialFinances={initialFinances}
      initialFixed={initialFixed}
      initialVariable={initialVariable}
      initialExtraIncome={initialExtraIncome}
      currentMonthLabel={now.toLocaleString('es-AR', { month: 'long', year: 'numeric' })}
    />
  )
}
