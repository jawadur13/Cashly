'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  showPasswordToggle?: boolean
}

export function Input({ label, error, hint, className, id, showPasswordToggle, onWheel, ...props }: InputProps) {
  const [visible, setVisible] = useState(false)
  const isPassword = props.type === 'password'
  const isNumber = props.type === 'number'
  const inputId = id ?? props.name

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-[0.8125rem] font-medium text-text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            'h-12 w-full rounded-[var(--radius-md)] border bg-surface px-3.5 text-[0.9375rem] text-text-primary placeholder:text-text-tertiary focus:outline-none',
            error
              ? 'border-expense focus:ring-2 focus:ring-expense/30'
              : 'border-border focus:border-accent focus:ring-2 focus:ring-accent-soft',
            showPasswordToggle && isPassword ? 'pr-11' : undefined,
            className
          )}
          onWheel={(e) => {
            if (isNumber) e.currentTarget.blur()
            onWheel?.(e)
          }}
          {...props}
          type={isPassword ? (visible ? 'text' : 'password') : props.type}
        />
        {showPasswordToggle && isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        )}
      </div>
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
