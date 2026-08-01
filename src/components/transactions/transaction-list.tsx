'use client'

import { useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ReceiptText } from 'lucide-react'
import { TransactionRow } from './transaction-row'
import type { Account, Category, Transaction } from '@/lib/types'

interface TransactionListProps {
  transactions: Transaction[]
  categories: Category[]
  accounts: Account[]
  loading: boolean
  onSelect: (id: string) => void
  emptyTitle?: string
  emptyDescription?: string
  rows?: number
}

export function TransactionList({
  transactions,
  categories,
  accounts,
  loading,
  onSelect,
  emptyTitle = 'No transactions yet',
  emptyDescription = 'Add your first income or expense to get started.',
  rows = 8,
}: TransactionListProps) {
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.$id, c])),
    [categories]
  )
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.$id, a])), [accounts])

  if (loading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2.5">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={<ReceiptText className="size-9" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  return (
    <div className="space-y-0.5">
      {transactions.map((t) => (
        <TransactionRow
          key={t.$id}
          transaction={t}
          category={categoryMap.get(t.categoryId)}
          account={accountMap.get(t.accountId)}
          onClick={() => onSelect(t.$id)}
        />
      ))}
    </div>
  )
}
