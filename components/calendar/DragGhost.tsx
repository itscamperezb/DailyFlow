'use client'

import { useAtomValue } from 'jotai'
import { dragStateAtom } from '@/atoms/ui'
import { minutesToPx } from '@/lib/time'

export interface DragGhostProps {
  ghostTop?: number
  ghostLeft?: number
  ghostHeight?: number
  ghostColor?: string
}

export function DragGhost({ ghostTop, ghostLeft, ghostHeight, ghostColor }: DragGhostProps) {
  const dragState = useAtomValue(dragStateAtom)

  if (!dragState || ghostTop === undefined) return null

  return (
    <div
      data-testid="drag-ghost"
      className="absolute pointer-events-none z-50 rounded-md opacity-70"
      style={{
        top: `${ghostTop}px`,
        left: ghostLeft !== undefined ? `${ghostLeft}px` : 0,
        height: ghostHeight !== undefined ? `${ghostHeight}px` : minutesToPx(60),
        width: '100%',
        backgroundColor: ghostColor ?? '#6366f1',
      }}
    />
  )
}
