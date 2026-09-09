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
        'inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-full)] border px-4 text-sm font-semibold transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.97]',
        selected
          ? 'border-primary bg-primary-soft text-primary shadow-[var(--shadow-sm)]'
          : 'border-border bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary',
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}
