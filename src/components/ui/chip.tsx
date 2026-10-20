'use client'

import { cn } from '@/lib/utils'

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  icon?: React.ReactNode
}

/** Toggle pill. Selected = navy fill, the one "selected" style used app-wide. */
export function Chip({ selected = false, icon, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'pressable inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-full)] px-4 text-sm font-semibold cursor-pointer',
        selected
          ? 'bg-primary text-on-primary shadow-[var(--shadow-sm)]'
          : 'bg-surface text-text-secondary ring-1 ring-inset ring-border hover:bg-surface-hover hover:text-text-primary',
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}
