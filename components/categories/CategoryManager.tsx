'use client'

import { useState } from 'react'
import { createStore, useAtomValue } from 'jotai'
import { categoriesAtom } from '@/atoms/categories'
import type { Category } from '@/atoms/categories'
import { createCategory, updateCategory, deleteCategory } from '@/actions/categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type JotaiStore = ReturnType<typeof createStore>

export interface CategoryManagerProps {
  store: JotaiStore
  weekDays: string[]
  userId: string
}

interface EditState {
  id: string
  name: string
  color: string
  icon: string
}

interface AddState {
  name: string
  color: string
  icon: string
}

const DEFAULT_ADD: AddState = { name: '', color: '#6366f1', icon: '' }

export function CategoryManager({ store, weekDays, userId }: CategoryManagerProps) {
  const categories = useAtomValue(categoriesAtom, { store })

  // Which category is pending delete confirmation
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  // Which category is being edited
  const [editState, setEditState] = useState<EditState | null>(null)
  // Add new category form
  const [showAdd, setShowAdd] = useState(false)
  const [addState, setAddState] = useState<AddState>(DEFAULT_ADD)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleDeleteClick = (id: string) => {
    setPendingDeleteId(id)
  }

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteId) return
    setIsSubmitting(true)
    try {
      await deleteCategory(store, pendingDeleteId, weekDays)
    } finally {
      setIsSubmitting(false)
      setPendingDeleteId(null)
    }
  }

  const handleDeleteCancel = () => {
    setPendingDeleteId(null)
  }

  const handleEditClick = (cat: Category) => {
    setEditState({ id: cat.id, name: cat.name, color: cat.color, icon: cat.icon })
    setPendingDeleteId(null)
  }

  const handleEditSave = async () => {
    if (!editState) return
    setIsSubmitting(true)
    try {
      await updateCategory(store, editState.id, {
        name: editState.name,
        color: editState.color,
        icon: editState.icon,
      })
    } finally {
      setIsSubmitting(false)
      setEditState(null)
    }
  }

  const handleEditCancel = () => {
    setEditState(null)
  }

  const handleAddSave = async () => {
    if (!addState.name.trim()) return
    setIsSubmitting(true)
    try {
      await createCategory(store, { name: addState.name, color: addState.color, icon: addState.icon }, userId)
      setAddState(DEFAULT_ADD)
      setShowAdd(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div data-slot="category-manager" className="flex flex-col gap-2">
      {/* Category list */}
      {categories.map((cat) => (
        <div key={cat.id} className="flex flex-col gap-1">
          {/* Row */}
          <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
            {/* Color swatch */}
            <span
              className="inline-block h-4 w-4 shrink-0 rounded-sm"
              style={{ backgroundColor: cat.color }}
              aria-hidden="true"
            />
            {/* Icon */}
            {cat.icon && (
              <span className="text-sm text-muted-foreground">{cat.icon}</span>
            )}
            {/* Name */}
            <span className="flex-1 text-sm font-medium">{cat.name}</span>
            {/* Actions */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleEditClick(cat)}
              aria-label={`Edit ${cat.name}`}
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              size="icon-sm"
              onClick={() => handleDeleteClick(cat.id)}
              aria-label={`Delete ${cat.name}`}
            >
              Delete
            </Button>
          </div>

          {/* Inline edit form */}
          {editState?.id === cat.id && (
            <div
              data-testid={`edit-form-${cat.id}`}
              className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 px-3 py-2"
            >
              <Input
                aria-label="Category name"
                value={editState.name}
                onChange={(e) => setEditState((s) => s ? { ...s, name: e.target.value } : s)}
              />
              <Input
                aria-label="Category color"
                type="color"
                value={editState.color}
                onChange={(e) => setEditState((s) => s ? { ...s, color: e.target.value } : s)}
              />
              <Input
                aria-label="Category icon"
                value={editState.icon}
                onChange={(e) => setEditState((s) => s ? { ...s, icon: e.target.value } : s)}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEditSave} disabled={isSubmitting}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleEditCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Inline delete confirmation */}
          {pendingDeleteId === cat.id && (
            <div
              data-testid={`delete-confirm-${cat.id}`}
              role="alertdialog"
              className="flex flex-col gap-2 rounded-md border border-destructive bg-destructive/5 px-3 py-2"
            >
              <p className="text-sm">
                ¿Desea eliminar todas las actividades relacionadas a esta categoría?
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  disabled={isSubmitting}
                >
                  Eliminar
                </Button>
                <Button size="sm" variant="outline" onClick={handleDeleteCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add new category */}
      {showAdd ? (
        <div
          data-testid="add-category-form"
          className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 px-3 py-2"
        >
          <Input
            aria-label="New category name"
            placeholder="Category name"
            value={addState.name}
            onChange={(e) => setAddState((s) => ({ ...s, name: e.target.value }))}
            autoFocus
          />
          <Input
            aria-label="New category color"
            type="color"
            value={addState.color}
            onChange={(e) => setAddState((s) => ({ ...s, color: e.target.value }))}
          />
          <Input
            aria-label="New category icon"
            placeholder="Icon name (e.g. dumbbell)"
            value={addState.icon}
            onChange={(e) => setAddState((s) => ({ ...s, icon: e.target.value }))}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddSave} disabled={isSubmitting || !addState.name.trim()}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowAdd(false); setAddState(DEFAULT_ADD) }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="mt-1"
          onClick={() => setShowAdd(true)}
        >
          Add category
        </Button>
      )}
    </div>
  )
}
