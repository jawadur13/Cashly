'use client'

import Link from 'next/link'
import { ChevronRight, ReceiptText } from 'lucide-react'
import { TransactionList } from '@/components/transactions/transaction-list'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeader } from '@/components/ui/list'
import { useQuickAdd } from '@/components/transactions/quick-add'
import type { Transaction } from '@/lib/types'

/** The latest few, grouped by day, with a way into the full Activity list. */
export function RecentTransactions({ transactions, loading }: { transactions: Transaction[]; loading?: boolean }) {
  const { open } = useQuickAdd()
  return (
    <section aria-label="Recent activity">
      <SectionHeader
        title="Recent activity"
        action={
          <Link href="/app/transactions" className="flex min-h-11 items-center gap-0.5 rounded-[var(--radius-md)] px-2 text-sm font-semibold text-accent hover:bg-accent-soft">
            See all <ChevronRight className="size-4" aria-hidden />
          </Link>
        }
      />
      <TransactionList
        transactions={transactions.slice(0, 6)}
        loading={loading}
        skeletonRows={4}
        empty={
          <EmptyState
            icon={<ReceiptText />}
            title="No transactions yet"
            description="Record your first income or expense and your balances come to life."
            action={<Button onClick={() => open()}>Add a transaction</Button>}
          />
        }
      />
    </section>
  )
}
