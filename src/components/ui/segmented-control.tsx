'use client'

import { cn } from '@/lib/utils'
import { TRANSACTION_TYPE_LABELS } from '@/lib/constants'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options?: SegmentedOption<T>[]
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: SegmentedControlProps<T>) {
  const resolved: SegmentedOption<T>[] =
    options ?? ([
      { value: 'income', label: TRANSACTION_TYPE_LABELS.income },
      { value: 'expense', label: TRANSACTION_TYPE_LABELS.expense },
    ] as SegmentedOption<T>[])

  return (
    <div
      className="grid rounded-[var(--radius-full)] bg-surface-hover p-1"
      style={{ gridTemplateColumns: `repeat(${resolved.length}, minmax(0, 1fr))` }}
      role="tablist"
    >
      {resolved.map((option) => {
        const selected = value === option.value
        const isIncome = option.value === 'income'
        const isExpense = option.value === 'expense'
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-10 rounded-[var(--radius-full)] text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent',
              selected
                ? 'bg-surface text-text-primary shadow-[var(--shadow-sm)]'
                : 'text-text-secondary hover:text-text-primary',
              selected && isIncome && 'text-income',
              selected && isExpense && 'text-expense'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
