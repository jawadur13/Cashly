'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, SearchX, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Chip } from '@/components/ui/chip'
import { Amount } from '@/components/ui/amount'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { ListSkeleton } from '@/components/ui/skeleton'
import { TransactionList } from '@/components/transactions/transaction-list'
import { TYPE_LABELS } from '@/components/transactions/transaction-row'
import { incomeExpenseTotals, matchesFilter, monthKeyOf, sortNewestFirst, type ActivityFilter } from '@/lib/activity'
import { convertMinor } from '@/lib/currency/currencies'
import { cn } from '@/lib/utils'
import { useAccounts } from '@/hooks/use-accounts'
import { useCategories } from '@/hooks/use-categories'
import { usePeople } from '@/hooks/use-people'
import { useExchangeRates } from '@/hooks/use-exchange-rates'
import { useAllTransactions } from '@/providers/all-transactions-provider'
import { useSettings } from '@/providers/settings-provider'
import type { TransactionType } from '@/lib/types'

const TYPES: TransactionType[] = ['expense', 'income', 'exchange', 'give', 'take']

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function Activity() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { transactions, loading, error, refresh } = useAllTransactions()
  const { accounts } = useAccounts()
  const { categories } = useCategories()
  const { people } = usePeople()
  const { defaultCurrency } = useSettings()
  const { rates } = useExchangeRates()

  const typeParam = params.get('type') as TransactionType | null
  const filter: ActivityFilter = {
    type: typeParam && TYPES.includes(typeParam) ? typeParam : undefined,
    accountId: params.get('account') ?? undefined,
    categoryId: params.get('category') ?? undefined,
    personId: params.get('person') ?? undefined,
    month: params.get('month') ?? undefined,
    query: params.get('q') ?? undefined,
  }

  // The search box updates the URL after a short pause, not on every key.
  const [query, setQuery] = useState(filter.query ?? '')
  const setParams = useCallback(
    (changes: Record<string, string | undefined>) => {
      const next = new URLSearchParams(params.toString())
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      const qs = next.toString()
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    },
    [params, pathname, router]
  )
  useEffect(() => {
    const id = setTimeout(() => {
      if ((filter.query ?? '') !== query.trim()) setParams({ q: query.trim() || undefined })
    }, 250)
    return () => clearTimeout(id)
  }, [query, filter.query, setParams])

  const labels = useMemo(() => {
    const c = new Map(categories.map((x) => [x.$id, x.name]))
    const p = new Map(people.map((x) => [x.$id, x.name]))
    const a = new Map(accounts.map((x) => [x.$id, x.name]))
    return { categoryName: (id: string) => c.get(id), personName: (id: string) => p.get(id), accountName: (id: string) => a.get(id) }
  }, [categories, people, accounts])

  const sorted = useMemo(() => sortNewestFirst(transactions), [transactions])
  const months = useMemo(() => [...new Set(sorted.map((t) => monthKeyOf(t.date)))], [sorted])
  const filtered = useMemo(
    () => sorted.filter((t) => matchesFilter(t, filter, labels)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sorted, labels, params]
  )
  const totals = useMemo(
    () => incomeExpenseTotals(filtered, (m, c) => convertMinor(m, c, defaultCurrency, rates)),
    [filtered, defaultCurrency, rates]
  )

  const active = Boolean(filter.type || filter.accountId || filter.categoryId || filter.personId || filter.month || filter.query)
  const clearAll = () => {
    setQuery('')
    router.replace(pathname, { scroll: false })
  }

  const category = categories.find((c) => c.$id === filter.categoryId)
  const person = people.find((p) => p.$id === filter.personId)

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Activity"
        subtitle={loading ? 'Loading…' : `${filtered.length} transaction${filtered.length === 1 ? '' : 's'}${active ? ' match' : ''}`}
      />

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-[1.125rem] -translate-y-1/2 text-text-tertiary" aria-hidden />
          <input
            type="search"
            aria-label="Search transactions"
            placeholder="Search notes, payees, categories, people"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 w-full rounded-[var(--radius-full)] bg-surface pl-11 pr-12 text-base text-text-primary shadow-[var(--shadow-sm)] ring-1 ring-inset ring-border placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="pressable absolute right-0.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-text-tertiary hover:text-text-primary"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Filter by type">
          <Chip selected={!filter.type} onClick={() => setParams({ type: undefined })} className="shrink-0">
            All
          </Chip>
          {TYPES.map((t) => (
            <Chip key={t} selected={filter.type === t} onClick={() => setParams({ type: filter.type === t ? undefined : t })} className="shrink-0">
              {TYPE_LABELS[t]}
            </Chip>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="relative">
            <span className="sr-only">Period</span>
            <select
              value={filter.month ?? ''}
              onChange={(e) => setParams({ month: e.target.value || undefined })}
              className={cn(
                'h-11 w-full cursor-pointer appearance-none truncate rounded-[var(--radius-full)] bg-surface px-4 text-sm font-semibold ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-accent',
                filter.month ? 'text-text-primary ring-border-strong' : 'text-text-secondary ring-border'
              )}
            >
              <option value="">All time</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <label className="relative">
            <span className="sr-only">Account</span>
            <select
              value={filter.accountId ?? ''}
              onChange={(e) => setParams({ account: e.target.value || undefined })}
              className={cn(
                'h-11 w-full cursor-pointer appearance-none truncate rounded-[var(--radius-full)] bg-surface px-4 text-sm font-semibold ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-accent',
                filter.accountId ? 'text-text-primary ring-border-strong' : 'text-text-secondary ring-border'
              )}
            >
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a.$id} value={a.$id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {(category || person) && (
          <div className="flex flex-wrap gap-2">
            {category && (
              <Chip selected onClick={() => setParams({ category: undefined })} aria-label={`Remove category filter ${category.name}`}>
                {category.name} <X className="size-3.5" aria-hidden />
              </Chip>
            )}
            {person && (
              <Chip selected onClick={() => setParams({ person: undefined })} aria-label={`Remove person filter ${person.name}`}>
                {person.name} <X className="size-3.5" aria-hidden />
              </Chip>
            )}
          </div>
        )}
      </div>

      {!loading && !error && filtered.length > 0 && (totals.income !== 0 || totals.expense !== 0) && (
        <div className="grid grid-cols-3 divide-x divide-border rounded-[var(--radius-lg)] bg-surface py-3 shadow-[var(--shadow-sm)] ring-1 ring-border">
          {[
            { label: 'In', value: totals.income, tone: 'income' as const },
            { label: 'Out', value: totals.expense, tone: 'neutral' as const },
            { label: 'Net', value: totals.net, tone: totals.net >= 0 ? ('income' as const) : ('expense' as const) },
          ].map((s) => (
            <div key={s.label} className="px-3 text-center">
              <p className="text-xs font-medium text-text-tertiary">{s.label}</p>
              <Amount value={s.value} currency={defaultCurrency} tone={s.tone} showPlus={s.label === 'Net'} className="mt-0.5 text-[0.9375rem] font-semibold" />
            </div>
          ))}
        </div>
      )}

      {error ? (
        <ErrorState what="your transactions" error={error} onRetry={refresh} />
      ) : (
        <TransactionList
          transactions={filtered}
          loading={loading}
          hideAccount={Boolean(filter.accountId)}
          empty={
            active ? (
              <EmptyState
                icon={<SearchX />}
                title="Nothing matches"
                description={filter.month ? `No matching transactions in ${monthLabel(filter.month)}.` : 'Try a different search or filter.'}
                action={<Button variant="secondary" onClick={clearAll}>Clear filters</Button>}
              />
            ) : undefined
          }
        />
      )}
    </div>
  )
}

export default function ActivityPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={6} />}>
      <Activity />
    </Suspense>
  )
}
