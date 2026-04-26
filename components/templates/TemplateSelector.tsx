'use client'

import { useState } from 'react'
import { createStore } from 'jotai'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { saveTemplate, applyTemplate, duplicatePreviousWeek } from '@/actions/templates'

type JotaiStore = ReturnType<typeof createStore>

interface Template {
  id: string
  name: string
}

interface TemplateSelectorProps {
  store: JotaiStore
  weekDays: string[]          // current week ISO dates (7 items)
  previousWeekDays: string[]  // previous week ISO dates (7 items)
  userId: string
  templates: Template[]       // list of available templates
  onTemplateSaved?: (id: string) => void
  onTemplateApplied?: () => void
}

export function TemplateSelector({
  store,
  weekDays,
  previousWeekDays,
  userId,
  templates,
  onTemplateSaved,
  onTemplateApplied,
}: TemplateSelectorProps) {
  const [saveOpen, setSaveOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)

  async function handleSaveTemplate() {
    if (!templateName.trim()) return
    setSaving(true)
    try {
      const id = await saveTemplate(store, weekDays, templateName.trim(), userId)
      onTemplateSaved?.(id)
      setTemplateName('')
      setSaveOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleApplyTemplate() {
    if (!selectedTemplateId) return
    setApplying(true)
    try {
      await applyTemplate(store, selectedTemplateId, weekDays)
      onTemplateApplied?.()
    } finally {
      setApplying(false)
    }
  }

  async function handleDuplicatePreviousWeek() {
    setApplying(true)
    try {
      await duplicatePreviousWeek(store, weekDays, previousWeekDays)
      onTemplateApplied?.()
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Save current week as template */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" data-testid="save-template-btn">
            Save as Template
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Week as Template</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-2">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                data-testid="template-name-input"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Busy Week, Rest Week…"
              />
            </div>
            <Button
              data-testid="confirm-save-template-btn"
              onClick={handleSaveTemplate}
              disabled={saving || !templateName.trim()}
            >
              {saving ? 'Saving…' : 'Save Template'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Apply existing template */}
      {templates.length > 0 && (
        <div className="flex items-center gap-1">
          <select
            data-testid="template-select"
            className="text-sm border rounded px-2 py-1 bg-background"
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
          >
            <option value="">Choose template…</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </select>
          <Button
            data-testid="apply-template-btn"
            variant="outline"
            size="sm"
            onClick={handleApplyTemplate}
            disabled={applying || !selectedTemplateId}
          >
            Apply
          </Button>
        </div>
      )}

      {/* Duplicate previous week */}
      <Button
        data-testid="duplicate-prev-week-btn"
        variant="outline"
        size="sm"
        onClick={handleDuplicatePreviousWeek}
        disabled={applying}
      >
        Duplicate Prev Week
      </Button>
    </div>
  )
}
