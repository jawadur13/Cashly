'use client'

import { cn } from '@/lib/utils'

export function Select({
  label,
  error,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={props.name} className="mb-2 block text-xs font-medium text-text-secondary">
          {label}
        </label>
      )}
      <select
        className={cn(
          'h-12 w-full rounded-[var(--radius-md)] border bg-surface px-3.5 text-[0.9375rem] text-text-primary focus:outline-none focus:ring-2',
          error
            ? 'border-expense focus:border-expense focus:ring-expense/30'
            : 'border-border focus:border-accent focus:ring-accent-soft',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-2 text-sm font-medium text-expense">{error}</p>}
    </div>
  )
}
