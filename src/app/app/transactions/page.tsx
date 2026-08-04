'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/ui/search-bar'
import { Select } from '@/components/ui/select'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { TransactionList } from '@/components/transactions/transaction-list'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadMoreButton } from '@/components/ui/load-more-button'
import { useTransactions } from '@/hooks/use-transactions'
import { useAccounts } from '@/hooks/use-accounts'
import { useCategories } from '@/hooks/use-categories'
import type { TransactionType } from '@/lib/types'

export default function TransactionsPage() {
  const router = useRouter()
  const { accounts } = useAccounts()
  const { categories } = useCategories()
  const [type, setType] = useState<TransactionType | 'all' | 'exchange'>('all')
  const [accountId, setAccountId] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const resolvedType = type === 'all' ? undefined : type
  const { transactions, loading, loadingMore, error, hasMore, loadMore } = useTransactions({
    type: resolvedType,
    accountId: accountId || undefined,
    search: search || undefined,
  })

  const filtersActive = Boolean(search || type !== 'all' || accountId)
  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setType('all')
    setAccountId('')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Transactions</h1>
          <p className="text-sm text-text-secondary">All your income, expenses, and exchanges</p>
        </div>
        <Button onClick={() => router.push('/app/transactions/new')} aria-label="Add transaction">
          <Plus className="size-5" />
        </Button>
      </div>

      <div className="space-y-3">
        <SegmentedControl
          value={type}
          onChange={setType}
          options={[
            { value: 'all', label: 'All' },
            { value: 'income', label: 'Income' },
            { value: 'expense', label: 'Expense' },
            { value: 'exchange', label: 'Exchange' },
          ]}
        />
        <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search by note or category…" />
        {accounts.length > 1 && (
          <Select name="account" label="Account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.$id} value={a.$id}>{a.name}</option>
            ))}
          </Select>
        )}
      </div>

      {error ? (
        <EmptyState
          icon={<ArrowLeftRight className="size-6" />}
          title="Couldn't load transactions"
          description={error}
          action={<Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>}
        />
      ) : (
        <>
          {!loading && transactions.length === 0 ? (
            <EmptyState
              icon={<ArrowLeftRight className="size-6" />}
              title={filtersActive ? 'No matches' : 'No transactions yet'}
              description={
                filtersActive
                  ? 'Try a different search or filter.'
                  : 'Tap + to add your first income, expense, or exchange.'
              }
              action={
                <Button variant="secondary" onClick={filtersActive ? clearFilters : () => router.push('/app/transactions/new')}>
                  {filtersActive ? 'Clear filters' : 'Add transaction'}
                </Button>
              }
            />
          ) : (
            <>
              <TransactionList
                transactions={transactions}
                categories={categories}
                accounts={accounts}
                loading={loading}
                onSelect={(id) => router.push(`/app/transactions/${id}`)}
              />
              <LoadMoreButton visible={hasMore} loading={loadingMore} onClick={loadMore} />
            </>
          )}
        </>
      )}
    </div>
  )
}
