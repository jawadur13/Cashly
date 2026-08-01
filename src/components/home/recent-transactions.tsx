'use client'

import { useRouter } from 'next/navigation'
import { TransactionList } from '@/components/transactions/transaction-list'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ReceiptText } from 'lucide-react'
import { useCategories } from '@/hooks/use-categories'
import { useAccounts } from '@/hooks/use-accounts'
import type { Transaction } from '@/lib/types'

interface RecentTransactionsProps {
  transactions: Transaction[]
  loading?: boolean
  onSeeAll?: () => void
}

export function RecentTransactions({ transactions, loading, onSeeAll }: RecentTransactionsProps) {
  const router = useRouter()
  const { categories } = useCategories()
  const { accounts } = useAccounts()

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Recent transactions</h2>
        {onSeeAll && (
          <button onClick={onSeeAll} className="text-xs font-medium text-accent hover:underline">
            See all
          </button>
        )}
      </div>
      {!loading && transactions.length === 0 ? (
        <EmptyState
          icon={<ReceiptText className="size-6" />}
          title="No transactions yet"
          description="Tap + to add your first income or expense."
          action={<Button onClick={() => router.push('/app/transactions/new')}>Add transaction</Button>}
        />
      ) : (
        <TransactionList
          transactions={transactions.slice(0, 5)}
          categories={categories}
          accounts={accounts}
          loading={loading ?? false}
          onSelect={(id) => router.push(`/app/transactions/${id}`)}
        />
      )}
    </section>
  )
}
