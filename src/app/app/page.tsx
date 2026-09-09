'use client'

import { useRouter } from 'next/navigation'
import { BalanceCard } from '@/components/home/balance-card'
import { AccountBalances } from '@/components/home/account-balances'
import { RecentTransactions } from '@/components/home/recent-transactions'
import { FAB } from '@/components/nav/fab'
import { useAccountBalances } from '@/hooks/use-account-balances'
import { useAccounts } from '@/hooks/use-accounts'
import { useTransactions } from '@/hooks/use-transactions'
import { useSettings } from '@/providers/settings-provider'
import { useAuth } from '@/providers/auth-provider'

export default function HomePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { defaultCurrency } = useSettings()
  const { accounts, loading: accountsLoading } = useAccounts()
  const { balances, total, loading: balancesLoading, error: balancesError } = useAccountBalances(defaultCurrency)
  const { transactions, loading: txLoading } = useTransactions({})

  const loading = accountsLoading || balancesLoading || txLoading

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Welcome back{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">Your money at a glance</p>
        </div>
      </div>

      {balancesError && (
        <p className="rounded-[var(--radius-md)] border border-expense/30 bg-expense-soft px-4 py-3 text-sm font-medium text-expense shadow-[var(--shadow-sm)]">
          Couldn&apos;t load your transactions, so these balances may be wrong. {balancesError}
        </p>
      )}

      <BalanceCard balance={total} loading={loading} />
      <AccountBalances accounts={accounts} balances={balances} defaultCurrency={defaultCurrency} loading={loading} />
      <RecentTransactions
        transactions={transactions.slice(0, 5)}
        loading={loading}
        onSeeAll={() => router.push('/app/transactions')}
      />

      <FAB />
    </div>
  )
}
