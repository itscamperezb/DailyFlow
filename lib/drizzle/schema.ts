import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  date,
  pgEnum,
} from 'drizzle-orm/pg-core'

export const activityStatusEnum = pgEnum('activity_status', [
  'planned',
  'in_progress',
  'completed',
  'skipped',
])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull(), // hex
  icon: text('icon').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const activities = pgTable('activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  day: date('day').notNull(),
  title: text('title').notNull(),
  startMin: integer('start_min').notNull(), // minutes since midnight
  durationMin: integer('duration_min').notNull(),
  categoryId: uuid('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),
  status: activityStatusEnum('status').notNull().default('planned'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const weeklyTemplates = pgTable('weekly_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const templateActivities = pgTable('template_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id')
    .notNull()
    .references(() => weeklyTemplates.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(), // 0-6
  title: text('title').notNull(),
  startMin: integer('start_min').notNull(),
  durationMin: integer('duration_min').notNull(),
  categoryId: uuid('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),
})

export const userFinances = pgTable('user_finances', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  salary: integer('salary').notNull().default(0),         // monthly salary in cents
  payFrequency: text('pay_frequency').notNull().default('monthly'), // 'monthly' | 'biweekly' | 'weekly'
  currency: text('currency').notNull().default('USD'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const fixedExpenses = pgTable('fixed_expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  icon: text('icon').notNull().default('💸'),
  monthlyAmount: integer('monthly_amount').notNull().default(0), // in cents
  quincena: text('quincena'), // 'primera' | 'segunda' | null
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const extraIncome = pgTable('extra_income', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  amount: integer('amount').notNull(), // in cents
  description: text('description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const variableExpenses = pgTable('variable_expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  amount: integer('amount').notNull(),  // in cents
  description: text('description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
