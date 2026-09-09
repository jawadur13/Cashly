'use client'

import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-[var(--radius-md)] transition-all duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 disabled:pointer-events-none disabled:transform-none select-none cursor-pointer'
  const variants = {
    primary: 'bg-primary text-on-primary shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]',
    secondary: 'bg-surface border border-border text-text-primary shadow-[var(--shadow-sm)] hover:bg-surface-hover hover:shadow-[var(--shadow-md)]',
    ghost: 'bg-transparent text-accent hover:bg-accent-soft',
    danger: 'bg-expense text-white shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]',
  }
  const sizes = {
    sm: 'h-11 px-3 text-sm',
    md: 'h-12 px-4 text-[0.9375rem]',
    lg: 'h-14 px-6 text-base',
  }
  return (
    <button
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent',
        className
      )}
      aria-hidden
    />
  )
}
