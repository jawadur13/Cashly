'use client'

import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? props.name
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-[0.8125rem] font-medium text-text-secondary">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn(
          'h-12 w-full rounded-[var(--radius-md)] border bg-surface px-3.5 text-[0.9375rem] text-text-primary placeholder:text-text-tertiary focus:outline-none',
          error
            ? 'border-expense focus:ring-2 focus:ring-expense/30'
            : 'border-border focus:border-accent focus:ring-2 focus:ring-accent-soft',
          className
        )}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-expense">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="mt-1 text-xs text-text-tertiary">
          {hint}
        </p>
      )}
    </div>
  )
}
