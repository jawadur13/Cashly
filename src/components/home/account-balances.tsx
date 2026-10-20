'use client'

import Link from 'next/link'
import { ChevronRight, Plus } from 'lucide-react'
import { Amount } from '@/components/ui/amount'
import { AccountIcon } from '@/components/ui/category-icon'
import { SectionHeader } from '@/components/ui/list'
import { Skeleton } from '@/components/ui/skeleton'
import { ACCOUNT_TYPE_LABELS } from '@/lib/constants'
import { convertMinor } from '@/lib/currency/currencies'
import { cn } from '@/lib/utils'
import { useExchangeRates } from '@/hooks/use-exchange-rates'
import { useBalanceVisibility } from '@/providers/balance-visibility-provider'
import type { Account } from '@/lib/types'

interface AccountBalancesProps {
  accounts: Account[]
  balances: Record<string, number>
  defaultCurrency: string
  loading?: boolean
  /** Carousel on phones; a vertical list in the desktop side column. */
  layout?: 'carousel' | 'list'
}

/** Each account as a compact card; tapping one opens its activity. */
export function AccountBalances({ accounts, balances, defaultCurrency, loading, layout = 'carousel' }: AccountBalancesProps) {
  const { rates } = useExchangeRates()
  const { hidden } = useBalanceVisibility()

  const card = (account: Account) => {
    const balance = balances[account.$id] ?? 0
    const foreign = account.currency !== defaultCurrency
    return (
      <Link
        key={account.$id}
        href={`/app/transactions?account=${account.$id}`}
        className={cn(
          'card-lift group flex flex-col justify-between rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-sm)] ring-1 ring-border',
          layout === 'carousel' ? 'min-h-[7.5rem] w-[11rem] shrink-0 snap-start' : 'min-h-0 flex-row items-center gap-3'
        )}
      >
        <div className={cn('flex items-center gap-2.5', layout === 'list' && 'min-w-0 flex-1')}>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-sunken text-text-secondary">
            <AccountIcon name={account.type} className="size-[1.125rem]" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-text-primary">{account.name}</span>
            <span className="block truncate text-xs text-text-tertiary">{ACCOUNT_TYPE_LABELS[account.type]}</span>
          </span>
        </div>
        <div className={cn(layout === 'carousel' ? 'mt-3' : 'text-right')}>
          <Amount
            value={balance}
            currency={account.currency}
            masked={hidden}
            tone={balance < 0 ? 'expense' : 'neutral'}
            className="text-base font-semibold"
          />
          {balance < 0 ? (
            <p className="text-xs font-medium text-expense">Overdrawn</p>
          ) : foreign && !hidden ? (
            <p className="text-xs text-text-tertiary">
              ≈ <Amount value={convertMinor(balance, account.currency, defaultCurrency, rates)} currency={defaultCurrency} />
            </p>
          ) : null}
        </div>
      </Link>
    )
  }

  return (
    <section aria-label="Accounts">
      <SectionHeader
        title="Accounts"
        action={
          <Link href="/app/accounts" className="flex min-h-11 items-center gap-0.5 rounded-[var(--radius-md)] px-2 text-sm font-semibold text-accent hover:bg-accent-soft">
            Manage <ChevronRight className="size-4" aria-hidden />
          </Link>
        }
      />
      {loading ? (
        <div className={cn(layout === 'carousel' ? 'flex gap-3 overflow-hidden' : 'space-y-2')}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className={cn('rounded-[var(--radius-lg)]', layout === 'carousel' ? 'h-[7.5rem] w-[11rem] shrink-0' : 'h-16')} />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <Link
          href="/app/accounts"
          className="flex min-h-16 items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-border-strong text-sm font-semibold text-text-secondary hover:bg-surface"
        >
          <Plus className="size-4" aria-hidden /> Add your first account
        </Link>
      ) : layout === 'carousel' ? (
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 scrollbar-none">
          {accounts.map(card)}
        </div>
      ) : (
        <div className="space-y-2">{accounts.map(card)}</div>
      )}
    </section>
  )
}
