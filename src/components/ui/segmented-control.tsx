'use client'

import { cn } from '@/lib/utils'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: SegmentedControlProps<T>) {
  return (
    <div
      className="grid rounded-[var(--radius-lg)] border border-border bg-surface-hover p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      role="tablist"
    >
      {options.map((option) => {
        const selected = value === option.value
        const isIncome = option.value === 'income'
        const isExpense = option.value === 'expense'
        const isExchange = option.value === 'exchange'
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-11 rounded-[var(--radius-md)] text-sm font-semibold transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent',
              selected
                ? 'bg-surface text-text-primary shadow-[var(--shadow-md)]'
                : 'text-text-secondary hover:text-text-primary',
              selected && isIncome && 'text-income',
              selected && isExpense && 'text-expense',
              selected && isExchange && 'text-exchange'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
