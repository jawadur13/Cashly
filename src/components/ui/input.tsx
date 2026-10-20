'use client'

import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  showPasswordToggle?: boolean
  /** Content inside the field on the left, e.g. a currency badge. */
  leading?: React.ReactNode
}

export function Input({ label, error, hint, className, id, showPasswordToggle, leading, onWheel, ...props }: InputProps) {
  const [visible, setVisible] = useState(false)
  const generated = useId()
  const isPassword = props.type === 'password'
  const isNumber = props.type === 'number'
  const inputId = id ?? props.name ?? generated
  const messageId = `${inputId}-message`

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        {leading && <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">{leading}</div>}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={cn(
            'h-12 w-full rounded-[var(--radius-md)] border bg-surface px-3.5 text-base text-text-primary shadow-[var(--shadow-sm)] transition-colors placeholder:text-text-tertiary focus:outline-none focus:ring-2',
            error
              ? 'border-expense focus:border-expense focus:ring-expense/25'
              : 'border-border hover:border-border-strong focus:border-accent focus:ring-accent-soft',
            showPasswordToggle && isPassword && 'pr-12',
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
            onClick={() => setVisible((v) => !v)}
            className="pressable absolute right-0.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-[var(--radius-md)] text-text-tertiary hover:text-text-primary"
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
          >
            {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        )}
      </div>
      {error ? (
        <p id={messageId} className="mt-2 text-sm font-medium text-expense">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-1.5 text-xs text-text-tertiary">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
