'use client'

import { useState } from 'react'
import { CloudOff, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  /** What failed to load, in the user's words: "your accounts". */
  what: string
  onRetry: () => unknown | Promise<unknown>
  /** The technical message; logged, never shown. */
  error?: string | null
  className?: string
}

/**
 * Shown instead of a screen's content when its data failed to load. Never fall
 * back to an empty state or zeros: "No accounts yet" after a failed load
 * invites the user to create duplicates, and ৳0 totals look like real numbers.
 */
export function ErrorState({ what, onRetry, error, className }: ErrorStateProps) {
  const [retrying, setRetrying] = useState(false)
  if (error) console.error(`Failed to load ${what}:`, error)
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface px-6 py-12 text-center',
        className
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-expense-soft text-expense">
        <CloudOff className="size-6" aria-hidden />
      </div>
      <h2 className="text-base font-semibold text-text-primary">Couldn&apos;t load {what}</h2>
      <p className="max-w-xs text-sm text-text-secondary">
        Check your connection and try again. Nothing has been changed.
      </p>
      <Button
        variant="secondary"
        loading={retrying}
        onClick={async () => {
          setRetrying(true)
          try {
            await onRetry()
          } finally {
            setRetrying(false)
          }
        }}
      >
        <RotateCw className="size-4" aria-hidden /> Try again
      </Button>
    </div>
  )
}
