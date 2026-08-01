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
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius-md)] transition-colors focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 disabled:pointer-events-none select-none'
  const variants = {
    primary: 'bg-accent text-white hover:opacity-90',
    secondary: 'bg-surface border border-border text-text-primary hover:bg-surface-hover',
    ghost: 'bg-transparent text-accent hover:bg-accent-soft',
    danger: 'bg-expense text-white hover:opacity-90',
  }
  const sizes = {
    sm: 'h-9 px-3 text-sm',
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
