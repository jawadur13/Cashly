'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/currency/format'
import { useSettings } from '@/providers/settings-provider'
import { cn } from '@/lib/utils'

interface MonthlySummaryProps {
  income: number
  expense: number
  exchange: number
  loading?: boolean
}

export function MonthlySummary({ income, expense, exchange, loading }: MonthlySummaryProps) {
  const { defaultCurrency } = useSettings()
  const savings = income - expense

  const stat = (label: string, value: number, tone: 'income' | 'expense' | 'exchange' | 'neutral') => (
    <div className="rounded-[var(--radius-md)] bg-bg px-3 py-3">
      <p className="text-xs text-text-secondary">{label}</p>
      {loading ? (
        <Skeleton className="mt-1.5 h-5 w-20" />
      ) : (
        <p
          className={cn(
            'mt-1 text-base font-semibold tabular-nums',
            tone === 'income' && 'text-income',
            tone === 'expense' && 'text-expense',
            tone === 'exchange' && 'text-exchange',
            tone === 'neutral' && savings < 0 && 'text-expense',
            tone === 'neutral' && savings >= 0 && 'text-text-primary'
          )}
        >
          {formatCurrency(value, defaultCurrency)}
        </p>
      )}
    </div>
  )

  return (
    <section className="grid grid-cols-4 gap-3">
      {stat('Income', income, 'income')}
      {stat('Expense', expense, 'expense')}
      {stat('Exchange', exchange, 'exchange')}
      {stat('Savings', savings, 'neutral')}
    </section>
  )
}
