'use server'

import { eq, and, gte, lte } from 'drizzle-orm'
import { db } from '@/lib/drizzle/client'
import { userFinances, fixedExpenses, variableExpenses, extraIncome } from '@/lib/drizzle/schema'

// ── User Finances ──────────────────────────────────────────────────────────

export async function dbGetUserFinances(userId: string) {
  const rows = await db
    .select()
    .from(userFinances)
    .where(eq(userFinances.userId, userId))
    .limit(1)
  return rows[0] ?? null
}

export async function dbUpsertUserFinances(
  userId: string,
  data: { salary: number; payFrequency: string; currency: string }
) {
  const existing = await dbGetUserFinances(userId)
  if (existing) {
    await db
      .update(userFinances)
      .set({ salary: data.salary, payFrequency: data.payFrequency, currency: data.currency })
      .where(eq(userFinances.userId, userId))
  } else {
    await db.insert(userFinances).values({
      userId,
      salary: data.salary,
      payFrequency: data.payFrequency,
      currency: data.currency,
    })
  }
}

// ── Fixed Expenses ─────────────────────────────────────────────────────────

export async function dbGetFixedExpenses(userId: string) {
  return db
    .select()
    .from(fixedExpenses)
    .where(eq(fixedExpenses.userId, userId))
}

export async function dbCreateFixedExpense(values: {
  id: string
  userId: string
  name: string
  icon: string
  monthlyAmount: number
  quincena?: string | null
}) {
  await db.insert(fixedExpenses).values(values)
}

export async function dbUpdateFixedExpense(
  id: string,
  updates: { name?: string; icon?: string; monthlyAmount?: number; quincena?: string | null }
) {
  await db.update(fixedExpenses).set(updates).where(eq(fixedExpenses.id, id))
}

export async function dbDeleteFixedExpense(id: string) {
  await db.delete(fixedExpenses).where(eq(fixedExpenses.id, id))
}

// ── Variable Expenses ──────────────────────────────────────────────────────

export async function dbGetVariableExpenses(
  userId: string,
  fromDate: string,
  toDate: string
) {
  return db
    .select()
    .from(variableExpenses)
    .where(
      and(
        eq(variableExpenses.userId, userId),
        gte(variableExpenses.date, fromDate),
        lte(variableExpenses.date, toDate)
      )
    )
}

export async function dbCreateVariableExpense(values: {
  id: string
  userId: string
  date: string
  amount: number
  description: string
}) {
  await db.insert(variableExpenses).values(values)
}

export async function dbDeleteVariableExpense(id: string) {
  await db.delete(variableExpenses).where(eq(variableExpenses.id, id))
}

// ── Extra Income ───────────────────────────────────────────────────────────

export async function dbGetExtraIncome(userId: string, fromDate: string, toDate: string) {
  return db.select().from(extraIncome).where(
    and(eq(extraIncome.userId, userId), gte(extraIncome.date, fromDate), lte(extraIncome.date, toDate))
  )
}

export async function dbCreateExtraIncome(values: {
  id: string; userId: string; date: string; amount: number; description: string
}) {
  await db.insert(extraIncome).values(values)
}

export async function dbDeleteExtraIncome(id: string) {
  await db.delete(extraIncome).where(eq(extraIncome.id, id))
}
