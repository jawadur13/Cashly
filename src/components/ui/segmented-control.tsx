'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  /** Names the group for screen readers, e.g. "Transaction type". */
  label?: string
  className?: string
}

/**
 * One-of-many picker. A radio group, not tabs: there are no tab panels, and
 * arrow keys move the selection the way radios do.
 *
 * Every option is `type="button"`. These sit inside forms (the transaction and
 * category forms), and a bare <button> there is a submit button — switching
 * Expense to Income used to save the form with the old type.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value))

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (index + step + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('relative grid rounded-[var(--radius-full)] bg-surface-sunken p-1', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {/* Sliding indicator: moves with transform only, so it stays smooth. */}
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-[var(--radius-full)] bg-surface shadow-[var(--shadow-sm)] transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)]"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${selectedIndex * 100}%)`,
        }}
      />
      {options.map((option, index) => {
        const selected = index === selectedIndex
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              'relative z-10 min-h-11 truncate rounded-[var(--radius-full)] px-1 text-[0.8125rem] font-semibold min-[420px]:text-sm transition-colors duration-[var(--dur-base)] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
              selected ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary',
              selected && option.value === 'income' && 'text-income',
              selected && option.value === 'expense' && 'text-expense',
              selected && option.value === 'exchange' && 'text-exchange'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
