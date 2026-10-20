'use client'

import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  loading?: boolean
}

export const BUTTON_BASE =
  'pressable inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold rounded-[var(--radius-md)] select-none cursor-pointer disabled:opacity-45 disabled:pointer-events-none'

export const BUTTON_VARIANTS = {
  primary: 'bg-primary text-on-primary shadow-[var(--shadow-sm)] hover:opacity-92',
  secondary: 'bg-surface text-text-primary ring-1 ring-inset ring-border-strong hover:bg-surface-hover',
  ghost: 'bg-transparent text-accent hover:bg-accent-soft',
  danger: 'bg-danger text-on-danger shadow-[var(--shadow-sm)] hover:opacity-92',
  gold: 'bg-gold text-[var(--navy-950)] shadow-[var(--shadow-sm)] hover:opacity-92',
}

export const BUTTON_SIZES = {
  sm: 'min-h-11 px-3.5 text-sm',
  md: 'min-h-12 px-5 text-[0.9375rem]',
  lg: 'min-h-14 px-6 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], fullWidth && 'w-full', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
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
      className={cn('inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent', className)}
      aria-hidden
    />
  )
}
