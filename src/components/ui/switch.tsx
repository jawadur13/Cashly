'use client'

import { cn } from '@/lib/utils'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  className?: string
}

/** An on/off row: the whole row is the control, 44px tall at minimum. */
export function Switch({ checked, onChange, label, description, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn('flex min-h-14 w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-surface-hover', className)}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-medium text-text-primary">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-text-secondary">{description}</span>}
      </span>
      <span
        aria-hidden
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-[var(--dur-base)]',
          checked ? 'bg-primary' : 'bg-border-strong'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-6 rounded-full bg-white shadow-[var(--shadow-sm)] transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)]',
            checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
          )}
        />
      </span>
    </button>
  )
}
