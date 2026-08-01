'use client'

import { useRouter } from 'next/navigation'
import { BalanceCard } from '@/components/home/balance-card'
import { MonthlySummary } from '@/components/home/monthly-summary'
import { AccountBalances } from '@/components/home/account-balances'
import { RecentTransactions } from '@/components/home/recent-transactions'
import { FAB } from '@/components/nav/fab'
import { useAccountBalances } from '@/hooks/use-account-balances'
import { useMonthlySummary } from '@/hooks/use-monthly-summary'
import { useAccounts } from '@/hooks/use-accounts'
import { useTransactions } from '@/hooks/use-transactions'

export default function HomePage() {
  const router = useRouter()
  const { accounts, loading: accountsLoading } = useAccounts()
  const { balances, total, loading: balancesLoading } = useAccountBalances()
  const { stats, loading: statsLoading } = useMonthlySummary()
  const { transactions, loading: txLoading } = useTransactions({})

  const loading = accountsLoading || balancesLoading || statsLoading || txLoading

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Home</h1>
          <p className="text-sm text-text-secondary">Your money at a glance</p>
        </div>
      </div>

      <BalanceCard balance={total} loading={loading} />
      <MonthlySummary income={stats.income} expense={stats.expense} loading={loading} />
      <AccountBalances accounts={accounts} balances={balances} loading={loading} />
      <RecentTransactions
        transactions={transactions.slice(0, 5)}
        loading={loading}
        onSeeAll={() => router.push('/app/transactions')}
      />

      <FAB />
    </div>
  )
}
