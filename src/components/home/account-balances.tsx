'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { AccountCard } from '@/components/accounts/account-card'
import type { Account } from '@/lib/types'

interface AccountBalancesProps {
  accounts: Account[]
  balances: Record<string, number>
  loading?: boolean
}

export function AccountBalances({ accounts, balances, loading }: AccountBalancesProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-text-primary">Accounts</h2>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-[72px] rounded-[var(--radius-md)]" />
          <Skeleton className="h-[72px] rounded-[var(--radius-md)]" />
        </div>
      ) : (
        accounts.map((account) => (
          <AccountCard key={account.$id} account={account} balance={balances[account.$id] ?? 0} />
        ))
      )}
    </section>
  )
}
