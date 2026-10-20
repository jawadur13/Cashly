'use client'

import { ArrowLeftRight, HandCoins, Minus, Plus } from 'lucide-react'
import { useQuickAdd } from '@/components/transactions/quick-add'
import { cn } from '@/lib/utils'
import type { TransactionType } from '@/lib/types'

const ACTIONS: { type: TransactionType; label: string; icon: typeof Plus; tone: string }[] = [
  { type: 'expense', label: 'Expense', icon: Minus, tone: 'bg-expense-soft text-expense' },
  { type: 'income', label: 'Income', icon: Plus, tone: 'bg-income-soft text-income' },
  { type: 'exchange', label: 'Transfer', icon: ArrowLeftRight, tone: 'bg-exchange-soft text-exchange' },
  { type: 'give', label: 'Give / Get', icon: HandCoins, tone: 'bg-gold-soft text-gold' },
]

/** One tap into the add sheet with the type already chosen. */
export function QuickActions() {
  const { open } = useQuickAdd()
  return (
    <section aria-label="Quick add" className="grid grid-cols-4 gap-2">
      {ACTIONS.map(({ type, label, icon: Icon, tone }) => (
        <button
          key={type}
          type="button"
          onClick={() => open({ type })}
          className="pressable flex min-h-[4.75rem] flex-col items-center justify-center gap-1.5 rounded-[var(--radius-lg)] bg-surface text-xs font-semibold text-text-secondary shadow-[var(--shadow-sm)] ring-1 ring-border hover:text-text-primary"
        >
          <span className={cn('flex size-9 items-center justify-center rounded-full', tone)}>
            <Icon className="size-[1.125rem]" strokeWidth={2.2} aria-hidden />
          </span>
          {label}
        </button>
      ))}
    </section>
  )
}
