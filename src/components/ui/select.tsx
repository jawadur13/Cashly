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
        <label htmlFor={props.name} className="mb-1.5 block text-[0.8125rem] font-medium text-text-secondary">
          {label}
        </label>
      )}
      <select
        className={cn(
          'h-12 w-full rounded-[var(--radius-md)] border bg-surface px-3.5 text-[0.9375rem] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-soft',
          error ? 'border-expense' : 'border-border',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-expense">{error}</p>}
    </div>
  )
}
