'use client'

import { useRef, useCallback } from 'react'
import type React from 'react'
import { createStore } from 'jotai'
import { resizeActivity } from '@/actions/activities'
import type { Activity } from '@/atoms/calendar'
import { DAY_END_MIN, SNAP_MIN, pxToMinutes, snap } from '@/lib/time'

type JotaiStore = ReturnType<typeof createStore>

export interface UseResizeActivityProps {
  activity: Activity
  store: JotaiStore
}

export interface UseResizeActivityResult {
  handleResizePointerDown: (
    e: React.PointerEvent<HTMLDivElement>,
    element: HTMLElement,
    blockTop: number
  ) => void
  handleResizePointerMove: (
    e: React.PointerEvent<HTMLDivElement>,
    blockTop: number
  ) => void
  handleResizePointerUp: (
    e: React.PointerEvent<HTMLDivElement>,
    element: HTMLElement,
    blockTop: number
  ) => void
}

export function useResizeActivity({
  activity,
  store,
}: UseResizeActivityProps): UseResizeActivityResult {
  const resizeRef = useRef<{ pointerId: number } | null>(null)

  const computeDuration = (clientY: number, blockTop: number): number => {
    const offsetPx = clientY - blockTop
    const rawMin = pxToMinutes(offsetPx)
    const snapped = snap(rawMin)
    // Enforce minimum duration
    const clamped = Math.max(snapped, SNAP_MIN)
    // Enforce midnight clamp
    const maxDuration = DAY_END_MIN - activity.startMin
    return Math.min(clamped, maxDuration)
  }

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, element: HTMLElement, _blockTop: number) => {
      e.stopPropagation?.()
      element.setPointerCapture(e.pointerId)
      resizeRef.current = { pointerId: e.pointerId }
    },
    []
  )

  const handleResizePointerMove = useCallback(
    (_e: React.PointerEvent<HTMLDivElement>, _blockTop: number) => {
      // Visual feedback would update a local state here
      // Kept minimal — actual resize committed on pointerup
    },
    []
  )

  const handleResizePointerUp = useCallback(
    async (e: React.PointerEvent<HTMLDivElement>, element: HTMLElement, blockTop: number) => {
      if (!resizeRef.current) return

      element.releasePointerCapture(e.pointerId)
      resizeRef.current = null

      const newDurationMin = computeDuration(e.clientY, blockTop)

      try {
        await resizeActivity(store, activity.id, activity.day, newDurationMin)
      } catch {
        // resizeActivity handles rollback internally
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activity.id, activity.day, activity.startMin, store]
  )

  return { handleResizePointerDown, handleResizePointerMove, handleResizePointerUp }
}
