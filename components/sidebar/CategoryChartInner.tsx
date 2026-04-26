import type { Category } from '@/atoms/categories'

export interface CategoryChartInnerProps {
  hoursByCategory: Record<string, number>
  categories: Category[]
}

/**
 * Pure inner chart component (no dynamic import) — testable in jsdom.
 * Renders horizontal bars showing completed hours per category.
 */
export function CategoryChartInner({ hoursByCategory, categories }: CategoryChartInnerProps) {
  // Build list of (category, hours) for categories that have > 0 hours
  const items = categories
    .filter((cat) => (hoursByCategory[cat.id] ?? 0) > 0)
    .map((cat) => ({ category: cat, hours: hoursByCategory[cat.id] }))

  if (items.length === 0) {
    return null
  }

  const maxHours = Math.max(...items.map((i) => i.hours))

  return (
    <div data-testid="category-chart" className="flex flex-col gap-2">
      {items.map(({ category, hours }) => {
        const widthPct = maxHours > 0 ? (hours / maxHours) * 100 : 0

        return (
          <div key={category.id} data-testid="category-bar" className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{category.name}</span>
              <span className="text-muted-foreground">{hours}h</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                data-testid="category-bar-fill"
                className="h-full rounded-full transition-all"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: category.color,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
