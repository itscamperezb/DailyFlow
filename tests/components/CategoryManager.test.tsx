import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createStore } from 'jotai'
import { categoriesAtom } from '@/atoms/categories'
import type { Category } from '@/atoms/categories'
import { dayActivitiesAtom, addActivityAtom } from '@/atoms/calendar'
import type { Activity } from '@/atoms/calendar'

// ----------------------------------------------------------------
// Mocks
// ----------------------------------------------------------------

vi.mock('@/actions/categories', () => ({
  createCategory: vi.fn().mockResolvedValue(undefined),
  updateCategory: vi.fn().mockResolvedValue(undefined),
  deleteCategory: vi.fn().mockResolvedValue(undefined),
}))

import { deleteCategory, createCategory, updateCategory } from '@/actions/categories'
import { CategoryManager } from '@/components/categories/CategoryManager'

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

const WEEK_DAYS = ['2024-01-15', '2024-01-16']

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    userId: 'user-1',
    name: 'Work',
    color: '#3b82f6',
    icon: 'briefcase',
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1',
    userId: 'user-1',
    day: '2024-01-15',
    title: 'Morning run',
    startMin: 360,
    durationMin: 60,
    categoryId: 'cat-1',
    status: 'planned',
    createdAt: '2024-01-15T06:00:00Z',
    ...overrides,
  }
}

function freshStore(categories: Category[] = [], activities: Activity[] = []) {
  dayActivitiesAtom.remove('2024-01-15')
  dayActivitiesAtom.remove('2024-01-16')
  const store = createStore()
  store.set(categoriesAtom, categories)
  for (const a of activities) {
    store.set(addActivityAtom, a)
  }
  return store
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe('CategoryManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---- Display ----

  it('renders all categories from the atom', () => {
    const cats = [
      makeCategory({ id: 'cat-1', name: 'Work' }),
      makeCategory({ id: 'cat-2', name: 'Health' }),
    ]
    const store = freshStore(cats)

    render(<CategoryManager store={store} weekDays={WEEK_DAYS} userId="user-1" />)

    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('Health')).toBeInTheDocument()
  })

  it('renders an "Add category" button', () => {
    const store = freshStore()
    render(<CategoryManager store={store} weekDays={WEEK_DAYS} userId="user-1" />)

    expect(
      screen.getByRole('button', { name: /add category/i })
    ).toBeInTheDocument()
  })

  it('renders a delete button for each category', () => {
    const cats = [
      makeCategory({ id: 'cat-1', name: 'Work' }),
      makeCategory({ id: 'cat-2', name: 'Health' }),
    ]
    const store = freshStore(cats)

    render(<CategoryManager store={store} weekDays={WEEK_DAYS} userId="user-1" />)

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    expect(deleteButtons).toHaveLength(2)
  })

  // ---- Delete confirmation dialog ----

  it('shows confirmation dialog with correct message when delete is clicked', async () => {
    const cat = makeCategory({ id: 'cat-1', name: 'Work' })
    const store = freshStore([cat])

    render(<CategoryManager store={store} weekDays={WEEK_DAYS} userId="user-1" />)

    const deleteBtn = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(deleteBtn)

    await waitFor(() => {
      expect(
        screen.getByText(/¿Desea eliminar todas las actividades relacionadas a esta categoría\?/i)
      ).toBeInTheDocument()
    })
  })

  it('shows Confirm and Cancel buttons inside the confirmation dialog', async () => {
    const cat = makeCategory({ id: 'cat-1', name: 'Work' })
    const store = freshStore([cat])

    render(<CategoryManager store={store} weekDays={WEEK_DAYS} userId="user-1" />)

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^eliminar$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel|cancelar/i })).toBeInTheDocument()
    })
  })

  it('calls deleteCategory with correct args when confirm is clicked', async () => {
    const cat = makeCategory({ id: 'cat-1', name: 'Work' })
    const store = freshStore([cat])

    render(<CategoryManager store={store} weekDays={WEEK_DAYS} userId="user-1" />)

    // Open confirmation
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^eliminar$/i })).toBeInTheDocument()
    })

    // Confirm deletion
    fireEvent.click(screen.getByRole('button', { name: /^eliminar$/i }))

    await waitFor(() => {
      expect(deleteCategory).toHaveBeenCalledWith(store, 'cat-1', WEEK_DAYS)
    })
  })

  it('does NOT call deleteCategory when cancel is clicked', async () => {
    const cat = makeCategory({ id: 'cat-1', name: 'Work' })
    const store = freshStore([cat])

    render(<CategoryManager store={store} weekDays={WEEK_DAYS} userId="user-1" />)

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel|cancelar/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /cancel|cancelar/i }))

    expect(deleteCategory).not.toHaveBeenCalled()
  })

  it('hides confirmation dialog after cancel', async () => {
    const cat = makeCategory({ id: 'cat-1', name: 'Work' })
    const store = freshStore([cat])

    render(<CategoryManager store={store} weekDays={WEEK_DAYS} userId="user-1" />)

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel|cancelar/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /cancel|cancelar/i }))

    await waitFor(() => {
      expect(
        screen.queryByText(/¿Desea eliminar todas las actividades relacionadas a esta categoría\?/i)
      ).not.toBeInTheDocument()
    })
  })

  // ---- Edit ----

  it('renders an edit button for each category', () => {
    const cats = [makeCategory({ id: 'cat-1', name: 'Work' })]
    const store = freshStore(cats)

    render(<CategoryManager store={store} weekDays={WEEK_DAYS} userId="user-1" />)

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })

  it('shows edit form when edit button is clicked', async () => {
    const cat = makeCategory({ id: 'cat-1', name: 'Work' })
    const store = freshStore([cat])

    render(<CategoryManager store={store} weekDays={WEEK_DAYS} userId="user-1" />)

    fireEvent.click(screen.getByRole('button', { name: /edit/i }))

    await waitFor(() => {
      // Should show some input or form for editing
      expect(screen.getByDisplayValue('Work')).toBeInTheDocument()
    })
  })
})
