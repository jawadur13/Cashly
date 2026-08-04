'use client'

import { useMemo } from 'react'
import { formatSignedAmount, formatDateTime, formatCurrency } from '@/lib/currency/format'
import { CategoryIcon } from '@/components/ui/category-icon'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/lib/types'

interface TransactionRowProps {
  transaction: Transaction
  /** Category – must be the category row for income/expense txns. */
  category?: { $id: string; name: string; icon?: string }
  /** Source account for income/expense, or the from-account for exchanges. */
  account?: { $id: string; name: string }
  /** Destination account, only meaningful for exchanges. */
  toAccount?: { $id: string; name: string }
  onClick?: () => void
}

export function TransactionRow({ transaction, category, account, toAccount, onClick }: TransactionRowProps) {
  const income = transaction.type === 'income'
  const isExchange = transaction.type === 'exchange'
  const secondLine = [
    transaction.payee,
    transaction.note,
    account ? `via ${account.name}` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  const exchangeLabel = useMemo(() => {
    if (!isExchange || !account || !toAccount) return ''
    const fromAmount = transaction.fromAmount ?? 0
    const toAmount = transaction.toAmount ?? 0
    const diff = toAmount - fromAmount
    if (diff > 0) return `+${formatCurrency(diff, transaction.currency)}`
    if (diff < 0) return `-${formatCurrency(Math.abs(diff), transaction.currency)}`
    return 'No change'
  }, [isExchange, account, toAccount, transaction.fromAmount, transaction.toAmount, transaction.currency])

  const exchangeGainLoss = useMemo(() => {
    if (!isExchange) return null
    const fromAmount = transaction.fromAmount ?? 0
    const toAmount = transaction.toAmount ?? 0
    const diff = toAmount - fromAmount
    return diff
  }, [isExchange, transaction.fromAmount, transaction.toAmount])

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-2 py-2.5 text-left transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full',
          isExchange ? 'bg-exchange-soft text-exchange' : income ? 'bg-income-soft text-income' : 'bg-expense-soft text-expense'
        )}
      >
        <CategoryIcon name={isExchange ? 'arrow-left-right' : category?.icon} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-medium text-text-primary">
          {isExchange ? 'Exchange' : (category?.name ?? 'Uncategorized')}
        </span>
        {isExchange && account && toAccount ? (
          <span className="block truncate text-xs text-text-secondary">
            {account.name} → {toAccount.name}
          </span>
        ) : (
          <span className="block truncate text-xs text-text-secondary">
            {secondLine || formatDateTime(transaction.date)}
          </span>
        )}
        {isExchange && (
          <span className="block text-xs text-text-tertiary">
            {formatCurrency(transaction.fromAmount ?? 0, transaction.currency)} → {formatCurrency(transaction.toAmount ?? 0, transaction.currency)} · {exchangeLabel}
          </span>
        )}
        {!isExchange && (
          <span className="block text-xs text-text-tertiary">{formatDateTime(transaction.date)}</span>
        )}
      </span>
      {isExchange ? (
        <span
          className={cn(
            'shrink-0 text-[0.8125rem] font-medium tabular-nums',
            exchangeGainLoss !== null && exchangeGainLoss > 0 && 'text-income',
            exchangeGainLoss !== null && exchangeGainLoss < 0 && 'text-expense',
            exchangeGainLoss === 0 && 'text-text-tertiary'
          )}
        >
          {exchangeGainLoss !== null && exchangeGainLoss > 0 ? `+${formatCurrency(exchangeGainLoss, transaction.currency)}` : null}
          {exchangeGainLoss !== null && exchangeGainLoss < 0 ? formatCurrency(exchangeGainLoss, transaction.currency) : null}
          {exchangeGainLoss === 0 ? '—' : null}
        </span>
      ) : (
        <span
          className={cn(
            'shrink-0 text-[0.9375rem] font-semibold tabular-nums',
            income ? 'text-income' : 'text-expense'
          )}
        >
          {formatSignedAmount(transaction.amount, transaction.currency, transaction.type)}
        </span>
      )}
    </button>
  )
}
