'use client'

import { formatSignedAmount, formatDateTime } from '@/lib/currency/format'
import { CategoryIcon } from '@/components/ui/category-icon'
import { cn } from '@/lib/utils'
import type { Account, Category, Transaction } from '@/lib/types'

interface TransactionRowProps {
  transaction: Transaction
  category?: Category
  account?: Account
  onClick?: () => void
}

export function TransactionRow({ transaction, category, account, onClick }: TransactionRowProps) {
  const income = transaction.type === 'income'
  const secondLine = [
    transaction.payee,
    transaction.note,
    account ? `via ${account.name}` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-2 py-2.5 text-left transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full',
          income ? 'bg-income-soft text-income' : 'bg-expense-soft text-expense'
        )}
      >
        <CategoryIcon name={category?.icon} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-medium text-text-primary">
          {category?.name ?? 'Uncategorized'}
        </span>
        {(secondLine || transaction.payee || transaction.note) && (
          <span className="block truncate text-xs text-text-secondary">
            {secondLine || formatDateTime(transaction.date)}
          </span>
        )}
        <span className="block text-xs text-text-tertiary">{formatDateTime(transaction.date)}</span>
      </span>
      <span
        className={cn(
          'shrink-0 text-[0.9375rem] font-semibold tabular-nums',
          income ? 'text-income' : 'text-expense'
        )}
      >
        {formatSignedAmount(transaction.amount, transaction.currency, transaction.type)}
      </span>
    </button>
  )
}
