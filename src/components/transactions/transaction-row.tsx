'use client'

import { useMemo } from 'react'
import { formatSignedMoney, formatDateTime, formatMoney } from '@/lib/currency/format'
import { CategoryIcon } from '@/components/ui/category-icon'
import { readAmountMinor, readFromAmountMinor, readToAmountMinor } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/lib/types'

interface TransactionRowProps {
  transaction: Transaction
  /** Category – must be the category row for income/expense txns. */
  category?: { $id: string; name: string; icon?: string }
  /** Source account for income/expense, or the from-account for transfers. */
  account?: { $id: string; name: string; currency?: string }
  /** Destination account, only meaningful for transfers. */
  toAccount?: { $id: string; name: string; currency?: string }
  /** Person for give/take transactions. */
  person?: { $id: string; name: string }
  onClick?: () => void
}

export function TransactionRow({ transaction, category, account, toAccount, person, onClick }: TransactionRowProps) {
  const income = transaction.type === 'income'
  const isExchange = transaction.type === 'exchange'
  const isGive = transaction.type === 'give'
  const isTake = transaction.type === 'take'
  const isPersonType = isGive || isTake
  const secondLine = [
    transaction.payee,
    transaction.note,
    account ? `via ${account.name}` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  // Each leg is denominated in its own account's currency. They normally match
  // — the form requires it — but older rows can cross currencies, and
  // subtracting one from the other then would be meaningless.
  const fromCurrency = account?.currency ?? transaction.currency
  const toCurrency = toAccount?.currency ?? transaction.currency
  const sameCurrency = fromCurrency === toCurrency

  const exchangeLabel = useMemo(() => {
    if (!isExchange || !account || !toAccount) return ''
    if (!sameCurrency) return 'Currency exchange'
    const diff = readToAmountMinor(transaction) - readFromAmountMinor(transaction)
    if (diff > 0) return `+${formatMoney(diff, toCurrency)}`
    if (diff < 0) return `-${formatMoney(Math.abs(diff), toCurrency)}`
    return 'No change'
  }, [isExchange, account, toAccount, transaction, sameCurrency, toCurrency])

  const exchangeGainLoss = useMemo(() => {
    if (!isExchange || !sameCurrency) return null
    return readToAmountMinor(transaction) - readFromAmountMinor(transaction)
  }, [isExchange, transaction, sameCurrency])

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-2 py-3 text-left transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full',
          isExchange && 'bg-exchange-soft text-exchange',
          isPersonType && isGive && 'bg-expense-soft text-expense',
          isPersonType && isTake && 'bg-income-soft text-income',
          !isExchange && !isPersonType && (income ? 'bg-income-soft text-income' : 'bg-expense-soft text-expense')
        )}
      >
        <CategoryIcon name={isExchange ? 'arrow-left-right' : isPersonType ? 'users' : category?.icon} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-medium text-text-primary">
          {isExchange ? 'Transfer' : isPersonType ? (person?.name ?? 'Unknown') : (category?.name ?? 'Uncategorized')}
        </span>
        {isExchange && account && toAccount ? (
          <span className="block truncate text-xs text-text-secondary">
            {account.name} → {toAccount.name}
          </span>
        ) : isPersonType ? (
          <span className="block truncate text-xs text-text-secondary">
            {isGive ? 'Given to' : 'Received from'} {person?.name} · via {account?.name}
          </span>
        ) : (
          <span className="block truncate text-xs text-text-secondary">
            {secondLine || formatDateTime(transaction.date)}
          </span>
        )}
        {isExchange && (
          <span className="block text-xs text-text-tertiary">
            {formatMoney(readFromAmountMinor(transaction), fromCurrency)} → {formatMoney(readToAmountMinor(transaction), toCurrency)} · {exchangeLabel}
          </span>
        )}
        {!isExchange && (
          <span className="block text-xs text-text-tertiary">
            {isPersonType && transaction.note ? transaction.note : formatDateTime(transaction.date)}
          </span>
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
          {exchangeGainLoss !== null && exchangeGainLoss > 0 ? `+${formatMoney(exchangeGainLoss, transaction.currency)}` : null}
          {exchangeGainLoss !== null && exchangeGainLoss < 0 ? formatMoney(exchangeGainLoss, transaction.currency) : null}
          {exchangeGainLoss === 0 || exchangeGainLoss === null ? '—' : null}
        </span>
      ) : isPersonType ? (
        <span className={cn('shrink-0 text-[0.9375rem] font-semibold tabular-nums', isGive ? 'text-expense' : 'text-income')}>
          {formatSignedMoney(readAmountMinor(transaction), transaction.currency, transaction.type)}
        </span>
      ) : (
        <span
          className={cn(
            'shrink-0 text-[0.9375rem] font-semibold tabular-nums',
            income ? 'text-income' : 'text-expense'
          )}
        >
          {formatSignedMoney(readAmountMinor(transaction), transaction.currency, income ? 'income' : 'expense')}
        </span>
      )}
    </button>
  )
}
