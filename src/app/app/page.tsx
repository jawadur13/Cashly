'use client'

import { BalanceCard } from '@/components/home/balance-card'
import { AccountBalances } from '@/components/home/account-balances'
import { RecentTransactions } from '@/components/home/recent-transactions'
import { QuickActions } from '@/components/home/quick-actions'
import { PeopleGlance, SpendingGlance } from '@/components/home/glance'
import { ErrorState } from '@/components/ui/error-state'
import { useAccountBalances } from '@/hooks/use-account-balances'
import { useAccounts } from '@/hooks/use-accounts'
import { useCategories } from '@/hooks/use-categories'
import { usePeople } from '@/hooks/use-people'
import { useExchangeRates } from '@/hooks/use-exchange-rates'
import { incomeExpenseTotals, monthKeyOf, sortNewestFirst, totalsByCategory } from '@/lib/activity'
import { savingsRate } from '@/lib/calculations'
import { convertMinor } from '@/lib/currency/currencies'
import { useAllTransactions } from '@/providers/all-transactions-provider'
import { useSettings } from '@/providers/settings-provider'
import { useAuth } from '@/providers/auth-provider'

function greeting(hour: number) {
  if (hour < 5) return 'Good evening'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function HomePage() {
  const { user } = useAuth()
  const { defaultCurrency } = useSettings()
  const { rates } = useExchangeRates()
  const { accounts, loading: accountsLoading } = useAccounts()
  const { categories } = useCategories()
  const { people } = usePeople()
  const { balances, total, loading: balancesLoading, error, refresh } = useAccountBalances(defaultCurrency)
  const { transactions, loading: txLoading } = useAllTransactions()
  const loading = accountsLoading || balancesLoading || txLoading

  const now = new Date()
  const monthKey = monthKeyOf(now)
  const monthName = now.toLocaleDateString(undefined, { month: 'long' })

  // The React Compiler memoizes these; each converts per row before adding.
  const convert = (m: number, c: string) => convertMinor(m, c, defaultCurrency, rates)
  const sorted = sortNewestFirst(transactions)
  const thisMonth = transactions.filter((t) => monthKeyOf(t.date) === monthKey)
  const monthTotals = incomeExpenseTotals(thisMonth, convert)
  const month = {
    income: monthTotals.income,
    expense: monthTotals.expense,
    rate: savingsRate(monthTotals.net, monthTotals.income),
    label: monthName,
  }
  const spending = totalsByCategory(thisMonth, 'expense', convert)

  const firstName = user?.name?.trim().split(/\s+/)[0]

  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">{greeting(now.getHours())}{firstName ? `, ${firstName}` : ''}</h1>
        <ErrorState what="your balances" error={error} onRetry={refresh} />
      </div>
    )
  }

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-12 lg:gap-8 lg:space-y-0">
      <div className="space-y-6 lg:col-span-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary md:text-[1.75rem]">
            {greeting(now.getHours())}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">Here&apos;s where your money stands.</p>
        </div>
        <BalanceCard balance={total} loading={loading} month={month} />
        <QuickActions />
        <div className="lg:hidden">
          <AccountBalances accounts={accounts} balances={balances} defaultCurrency={defaultCurrency} loading={loading} />
        </div>
        <RecentTransactions transactions={sorted} loading={loading} />
        <div className="space-y-6 lg:hidden">
          <SpendingGlance totals={spending} categories={categories} currency={defaultCurrency} month={monthKey} monthLabel={monthName} />
          <PeopleGlance people={people} currency={defaultCurrency} />
        </div>
      </div>
      <aside className="hidden space-y-6 lg:col-span-4 lg:block lg:pt-[4.5rem]">
        <AccountBalances accounts={accounts} balances={balances} defaultCurrency={defaultCurrency} loading={loading} layout="list" />
        <SpendingGlance totals={spending} categories={categories} currency={defaultCurrency} month={monthKey} monthLabel={monthName} />
        <PeopleGlance people={people} currency={defaultCurrency} />
      </aside>
    </div>
  )
}
