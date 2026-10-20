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
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-[var(--radius-lg)] bg-surface px-6 py-12 text-center ring-1 ring-border',
        className
      )}
    >
      <div className="mb-1 flex size-16 items-center justify-center rounded-full bg-gold-soft text-gold [&_svg]:size-7" aria-hidden>
        {icon}
      </div>
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      {description && <p className="max-w-xs text-sm text-text-secondary">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
