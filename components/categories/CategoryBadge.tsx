import type { Category } from '@/atoms/categories'
import { cn } from '@/lib/utils'

export interface CategoryBadgeProps {
  category: Category
  className?: string
}

/**
 * Small pill badge that displays a category's color, icon, and name.
 * Used in ActivityBlock and ActivityForm.
 */
export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  return (
    <span
      data-slot="category-badge"
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        className
      )}
      style={{ backgroundColor: category.color + '33', color: category.color }}
    >
      {category.icon && (
        <span aria-hidden="true" className="text-[0.6rem]">
          {category.icon}
        </span>
      )}
      {category.name}
    </span>
  )
}
