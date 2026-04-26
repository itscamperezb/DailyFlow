'use client'

import { useState, useEffect } from 'react'
import { createStore, useAtomValue } from 'jotai'
import type { Activity } from '@/atoms/calendar'
import { categoriesAtom } from '@/atoms/categories'
import { createActivity, updateActivityStatus } from '@/actions/activities'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { minToTime, timeToMin } from '@/lib/time'

type JotaiStore = ReturnType<typeof createStore>

export interface ActivityFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  store: JotaiStore
  /** If provided, edit mode; otherwise create mode */
  activity?: Activity
  /** Default day for create mode */
  defaultDay?: string
  /** Default userId */
  userId?: string
}

interface FormState {
  title: string
  categoryId: string
  startTime: string       // "HH:mm"
  durationMin: number
  status: Activity['status']
}

const DEFAULT_FORM: FormState = {
  title: '',
  categoryId: '',
  startTime: '09:00',
  durationMin: 60,
  status: 'planned',
}

export function ActivityForm({
  open,
  onOpenChange,
  store,
  activity,
  defaultDay,
  userId = '',
}: ActivityFormProps) {
  const categories = useAtomValue(categoriesAtom, { store })
  const isEditMode = Boolean(activity)

  const [form, setForm] = useState<FormState>(() =>
    activity
      ? {
          title: activity.title,
          categoryId: activity.categoryId,
          startTime: minToTime(activity.startMin),
          durationMin: activity.durationMin,
          status: activity.status,
        }
      : DEFAULT_FORM
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync form when activity prop changes
  useEffect(() => {
    if (activity) {
      setForm({
        title: activity.title,
        categoryId: activity.categoryId,
        startTime: minToTime(activity.startMin),
        durationMin: activity.durationMin,
        status: activity.status,
      })
    } else {
      setForm(DEFAULT_FORM)
    }
  }, [activity])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onOpenChange(false)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setError('Title is required')
      return
    }
    if (!form.categoryId) {
      setError('Category is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      if (isEditMode && activity) {
        // Update status only in this simplified flow;
        // full edit would call a separate updateActivity action
        if (form.status !== activity.status) {
          await updateActivityStatus(store, activity.id, activity.day, form.status)
        }
      } else {
        const day = defaultDay ?? new Date().toISOString().slice(0, 10)
        await createActivity(store, {
          userId,
          day,
          title: form.title.trim(),
          startMin: timeToMin(form.startTime),
          durationMin: form.durationMin,
          categoryId: form.categoryId,
          status: form.status,
        })
      }
      onOpenChange(false)
    } catch {
      setError('Failed to save activity. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Activity' : 'New Activity'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="activity-title">Title</Label>
            <Input
              id="activity-title"
              placeholder="Activity title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              autoFocus
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="activity-category">Category</Label>
            <select
              id="activity-category"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            >
              <option value="">Select category…</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start time */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="activity-start">Start time</Label>
            <Input
              id="activity-start"
              type="time"
              value={form.startTime}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
            />
          </div>

          {/* Duration */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="activity-duration">Duration (minutes)</Label>
            <Input
              id="activity-duration"
              type="number"
              min={15}
              step={15}
              value={form.durationMin}
              onChange={(e) =>
                setForm((f) => ({ ...f, durationMin: Number(e.target.value) }))
              }
            />
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="activity-status">Status</Label>
            <select
              id="activity-status"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as Activity['status'] }))
              }
            >
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="skipped">Skipped</option>
            </select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEditMode ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
