'use client'

import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton-shimmer rounded-[var(--radius-md)]', className)} aria-hidden />
}

/** Placeholder for a grouped list: one card, hairline rows. Matches <ListGroup>. */
export function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-[var(--radius-lg)] bg-surface ring-1 ring-border', className)} aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <Skeleton className="size-10 shrink-0 rounded-[var(--radius-md)]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}
