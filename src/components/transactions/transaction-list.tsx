'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ReceiptText } from 'lucide-react'
import { ListGroup } from '@/components/ui/list'
import { ListSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Amount } from '@/components/ui/amount'
import { convertMinor } from '@/lib/currency/currencies'
import { formatDayHeading } from '@/lib/currency/format'
import { groupByDay, incomeExpenseTotals } from '@/lib/activity'
import { useAccounts } from '@/hooks/use-accounts'
import { useCategories } from '@/hooks/use-categories'
import { usePeople } from '@/hooks/use-people'
import { useExchangeRates } from '@/hooks/use-exchange-rates'
import { useSettings } from '@/providers/settings-provider'
import { TransactionRow } from './transaction-row'
import type { Transaction } from '@/lib/types'

interface TransactionListProps {
  /** Already sorted newest first. */
  transactions: Transaction[]
  loading?: boolean
  /** Day headings with a per-day net (default). Off for short lists. */
  grouped?: boolean
  /** Render this many, then more as the user scrolls. */
  pageSize?: number
  hideAccount?: boolean
  empty?: React.ReactNode
  skeletonRows?: number
}

export function TransactionList({
  transactions,
  loading = false,
  grouped = true,
  pageSize = 40,
  hideAccount,
  empty,
  skeletonRows = 6,
}: TransactionListProps) {
  const { accounts } = useAccounts()
  const { categories } = useCategories()
  const { people } = usePeople()
  const { defaultCurrency } = useSettings()
  const { rates } = useExchangeRates()
  const [visible, setVisible] = useState(pageSize)
  const sentinel = useRef<HTMLDivElement>(null)

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.$id, c])), [categories])
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.$id, a])), [accounts])
  const personMap = useMemo(() => new Map(people.map((p) => [p.$id, p])), [people])

  // A new list (filters changed) starts from the top.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(pageSize)
  }, [transactions, pageSize])

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible((v) => v + pageSize)
      },
      { rootMargin: '600px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [pageSize, transactions.length, visible])

  if (loading) return <ListSkeleton rows={skeletonRows} />

  if (transactions.length === 0) {
    return (
      <>
        {empty ?? (
          <EmptyState
            icon={<ReceiptText />}
            title="No transactions yet"
            description="Tap + to record your first income, expense or transfer."
          />
        )}
      </>
    )
  }

  const shown = transactions.slice(0, visible)
  const row = (t: Transaction) => (
    <TransactionRow
      key={t.$id}
      transaction={t}
      category={categoryMap.get(t.categoryId)}
      account={accountMap.get(t.type === 'exchange' ? (t.fromAccountId ?? t.accountId) : t.accountId)}
      toAccount={t.type === 'exchange' ? accountMap.get(t.toAccountId ?? '') : undefined}
      person={personMap.get(t.personId ?? '')}
      timeOnly={grouped}
      hideAccount={hideAccount}
    />
  )

  return (
    <div>
      {grouped ? (
        <div className="space-y-5">
          {groupByDay(shown).map((group) => {
            const { net } = incomeExpenseTotals(group.items, (m, c) => convertMinor(m, c, defaultCurrency, rates))
            return (
              <section key={group.key} aria-label={formatDayHeading(group.date)}>
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <h3 className="text-sm font-semibold text-text-primary">{formatDayHeading(group.date)}</h3>
                  {net !== 0 && (
                    <Amount
                      value={net}
                      currency={defaultCurrency}
                      showPlus
                      tone={net > 0 ? 'income' : 'muted'}
                      className="text-xs font-medium"
                    />
                  )}
                </div>
                <ListGroup>{group.items.map(row)}</ListGroup>
              </section>
            )
          })}
        </div>
      ) : (
        <ListGroup>{shown.map(row)}</ListGroup>
      )}
      {visible < transactions.length && <div ref={sentinel} className="h-px" aria-hidden />}
    </div>
  )
}
