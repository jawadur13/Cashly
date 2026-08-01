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
    <div className={cn('flex flex-col items-center gap-3 px-6 py-12 text-center', className)}>
      <div className="flex size-20 items-center justify-center rounded-full bg-surface-hover text-text-tertiary">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      {description && <p className="max-w-xs text-sm text-text-secondary">{description}</p>}
      {action}
    </div>
  )
}
