'use client'

import type React from 'react'
import { useRef } from 'react'
import { createStore } from 'jotai'
import type { Activity } from '@/atoms/calendar'
import { useDragActivity } from '@/hooks/useDragActivity'
import { useResizeActivity } from '@/hooks/useResizeActivity'

type JotaiStore = ReturnType<typeof createStore>

export interface ActivityBlockProps {
  activity: Activity
  columnRef: React.RefObject<HTMLDivElement>
  store: JotaiStore
  categoryColor?: string
}

export function ActivityBlock({
  activity,
  columnRef,
  store,
  categoryColor = '#6366f1',
}: ActivityBlockProps) {
  const blockRef = useRef<HTMLDivElement>(null)

  const { isDragging, handlePointerDown, handlePointerMove, handlePointerUp } = useDragActivity({
    activity,
    columnRef,
    store,
  })

  const { handleResizePointerDown, handleResizePointerMove, handleResizePointerUp } =
    useResizeActivity({ activity, store })

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (blockRef.current) {
      handlePointerDown(e, blockRef.current)
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    handlePointerMove(e)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (blockRef.current) {
      handlePointerUp(e, blockRef.current)
    }
  }

  const onResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const handleEl = e.currentTarget
    const blockTop = blockRef.current?.getBoundingClientRect().top ?? 0
    handleResizePointerDown(e, handleEl, blockTop)
  }

  const onResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const blockTop = blockRef.current?.getBoundingClientRect().top ?? 0
    handleResizePointerMove(e, blockTop)
  }

  const onResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const handleEl = e.currentTarget
    const blockTop = blockRef.current?.getBoundingClientRect().top ?? 0
    handleResizePointerUp(e, handleEl, blockTop)
  }

  return (
    <div
      ref={blockRef}
      className="absolute inset-0 rounded-md px-2 py-1 cursor-grab select-none overflow-hidden"
      style={{
        backgroundColor: categoryColor,
        opacity: isDragging ? 0.5 : 1,
      }}
      data-dragging={isDragging ? 'true' : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <p className="text-xs font-medium text-white truncate">{activity.title}</p>

      {/* Resize handle */}
      <div
        data-resize-handle
        className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize bg-black/10 hover:bg-black/20"
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
      />
    </div>
  )
}
