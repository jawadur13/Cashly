'use client'

import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-[var(--radius-md)] bg-surface-hover', className)}
      aria-hidden
    />
  )
}
