import {
  dbGetUserFinances,
  dbUpsertUserFinances,
  dbGetFixedExpenses,
  dbCreateFixedExpense,
  dbUpdateFixedExpense,
  dbDeleteFixedExpense,
  dbGetExtraIncome,
  dbCreateExtraIncome,
  dbDeleteExtraIncome,
  dbGetVariableExpenses,
  dbCreateVariableExpense,
  dbDeleteVariableExpense,
} from './finances.db'

// ── Types ──────────────────────────────────────────────────────────────────

export interface UserFinances {
  id: string
  userId: string
  salary: number       // cents
  payFrequency: string
  currency: string
  createdAt: string | null
}

export interface FixedExpense {
  id: string
  userId: string
  name: string
  icon: string
  monthlyAmount: number  // cents
  quincena: string | null  // 'primera' | 'segunda' | null
  createdAt: string | null
}

export interface VariableExpense {
  id: string
  userId: string
  date: string
  amount: number  // cents
  description: string
  createdAt: string | null
}

// ── Wrappers ───────────────────────────────────────────────────────────────

export async function getUserFinances(userId: string): Promise<UserFinances | null> {
  return dbGetUserFinances(userId) as Promise<UserFinances | null>
}

export async function upsertUserFinances(
  userId: string,
  data: { salary: number; payFrequency: string; currency: string }
): Promise<void> {
  return dbUpsertUserFinances(userId, data)
}

export async function getFixedExpenses(userId: string): Promise<FixedExpense[]> {
  return dbGetFixedExpenses(userId) as Promise<FixedExpense[]>
}

export async function createFixedExpense(values: {
  id: string
  userId: string
  name: string
  icon: string
  monthlyAmount: number
}): Promise<void> {
  return dbCreateFixedExpense(values)
}

export async function updateFixedExpense(
  id: string,
  updates: { name?: string; icon?: string; monthlyAmount?: number; quincena?: string | null }
): Promise<void> {
  return dbUpdateFixedExpense(id, updates)
}

export async function deleteFixedExpense(id: string): Promise<void> {
  return dbDeleteFixedExpense(id)
}

export interface ExtraIncome {
  id: string; userId: string; date: string; amount: number; description: string; createdAt: string | null
}

export async function getExtraIncome(userId: string, fromDate: string, toDate: string): Promise<ExtraIncome[]> {
  return dbGetExtraIncome(userId, fromDate, toDate) as Promise<ExtraIncome[]>
}

export async function createExtraIncome(values: {
  id: string; userId: string; date: string; amount: number; description: string
}): Promise<void> {
  return dbCreateExtraIncome(values)
}

export async function deleteExtraIncome(id: string): Promise<void> {
  return dbDeleteExtraIncome(id)
}

export async function getVariableExpenses(
  userId: string,
  fromDate: string,
  toDate: string
): Promise<VariableExpense[]> {
  return dbGetVariableExpenses(userId, fromDate, toDate) as Promise<VariableExpense[]>
}

export async function createVariableExpense(values: {
  id: string
  userId: string
  date: string
  amount: number
  description: string
}): Promise<void> {
  return dbCreateVariableExpense(values)
}

export async function deleteVariableExpense(id: string): Promise<void> {
  return dbDeleteVariableExpense(id)
}
