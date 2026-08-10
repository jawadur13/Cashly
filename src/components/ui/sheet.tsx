'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 max-h-[90dvh] w-full overflow-y-auto rounded-t-[var(--radius-lg)] bg-surface shadow-[var(--shadow-md)] md:max-h-[85dvh] md:max-w-md md:rounded-[var(--radius-lg)]',
          className
        )}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex size-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="px-4 py-4">{children}</div>
      </div>
    </div>
  )
}
