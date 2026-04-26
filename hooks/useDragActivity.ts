'use client'

import { useRef, useState, useCallback } from 'react'
import type React from 'react'
import { createStore } from 'jotai'
import { dragStateAtom } from '@/atoms/ui'
import { moveActivity } from '@/actions/activities'
import type { Activity } from '@/atoms/calendar'
import { DAY_START_MIN, pxToMinutes, snap, clampToDay } from '@/lib/time'

type JotaiStore = ReturnType<typeof createStore>

export interface UseDragActivityProps {
  activity: Activity
  columnRef: React.RefObject<HTMLDivElement>
  store: JotaiStore
  onDragStart?: () => void
  onDragEnd?: () => void
}

export interface UseDragActivityResult {
  isDragging: boolean
  handlePointerDown: (e: React.PointerEvent<HTMLDivElement>, element: HTMLElement) => void
  handlePointerMove: (e: React.PointerEvent<HTMLDivElement>) => void
  handlePointerUp: (e: React.PointerEvent<HTMLDivElement>, element: HTMLElement) => void
}

export function useDragActivity({
  activity,
  columnRef,
  store,
  onDragStart,
  onDragEnd,
}: UseDragActivityProps): UseDragActivityResult {
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
  } | null>(null)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, element: HTMLElement) => {
      e.stopPropagation?.()
      element.setPointerCapture(e.pointerId)
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
      }
      setIsDragging(true)
      store.set(dragStateAtom, { activityId: activity.id, sourceDay: activity.day })
      onDragStart?.()
    },
    [activity.id, activity.day, store, onDragStart]
  )

  const handlePointerMove = useCallback(
    (_e: React.PointerEvent<HTMLDivElement>) => {
      // Ghost position is computed in DragGhost via dragStateAtom + pointer coords
      // Pure pointer tracking — actual atom update happens on pointerup
    },
    []
  )

  const handlePointerUp = useCallback(
    async (e: React.PointerEvent<HTMLDivElement>, element: HTMLElement) => {
      if (!dragRef.current) return

      element.releasePointerCapture(e.pointerId)
      dragRef.current = null
      setIsDragging(false)
      store.set(dragStateAtom, null)

      const column = columnRef.current
      if (!column) {
        onDragEnd?.()
        return
      }

      const bounds = column.getBoundingClientRect()
      const offsetPx = e.clientY - bounds.top
      const rawMin = pxToMinutes(offsetPx) + DAY_START_MIN
      const newStartMin = clampToDay(snap(rawMin))

      try {
        await moveActivity(store, activity.id, activity.day, activity.day, newStartMin)
      } catch {
        // moveActivity handles rollback internally
      }

      onDragEnd?.()
    },
    [activity.id, activity.day, columnRef, store, onDragEnd]
  )

  return { isDragging, handlePointerDown, handlePointerMove, handlePointerUp }
}
