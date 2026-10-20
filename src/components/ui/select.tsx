'use client'

import { useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Select({
  label,
  error,
  hint,
  className,
  children,
  id,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string; hint?: string }) {
  // Every select gets an id so its label is programmatically attached; before,
  // the label pointed at `name` and no select had that id.
  const generated = useId()
  const selectId = id ?? generated
  const messageId = `${selectId}-message`
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="mb-2 block text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={cn(
            'h-12 w-full cursor-pointer appearance-none rounded-[var(--radius-md)] border bg-surface pl-3.5 pr-10 text-base text-text-primary shadow-[var(--shadow-sm)] transition-colors focus:outline-none focus:ring-2',
            error
              ? 'border-expense focus:border-expense focus:ring-expense/25'
              : 'border-border hover:border-border-strong focus:border-accent focus:ring-accent-soft',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" aria-hidden />
      </div>
      {error ? (
        <p id={messageId} className="mt-2 text-sm font-medium text-expense">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-2 text-xs text-text-tertiary">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
