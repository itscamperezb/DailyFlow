'use client'

import dynamic from 'next/dynamic'
import type { CategoryChartInnerProps } from './CategoryChartInner'

/**
 * SSR-safe wrapper around CategoryChartInner.
 * The inner component is only loaded on the client to avoid recharts SSR issues
 * (recharts itself is not used here, but keeping the pattern consistent).
 */
const CategoryChartInner = dynamic(
  () => import('./CategoryChartInner').then((m) => m.CategoryChartInner),
  { ssr: false }
)

export function CategoryChart(props: CategoryChartInnerProps) {
  return <CategoryChartInner {...props} />
}
