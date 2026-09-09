'use client'

import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-6 py-14 text-center shadow-[var(--shadow-sm)]', className)}>
      <div className="flex size-20 items-center justify-center rounded-[var(--radius-lg)] bg-primary-soft text-primary">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
      {description && <p className="max-w-xs text-sm text-text-secondary">{description}</p>}
      {action}
    </div>
  )
}
