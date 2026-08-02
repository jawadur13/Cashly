'use client'

import { cn } from '@/lib/utils'

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  icon?: React.ReactNode
}

export function Chip({ selected = false, icon, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-full)] border px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent',
        selected
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-border bg-surface text-text-secondary hover:bg-surface-hover',
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}
