'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/currency/format'
import { useSettings } from '@/providers/settings-provider'

interface BalanceCardProps {
  balance: number
  loading?: boolean
}

export function BalanceCard({ balance, loading }: BalanceCardProps) {
  const { defaultCurrency } = useSettings()
  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
      <p className="text-sm text-text-secondary">Current balance</p>
      {loading ? (
        <Skeleton className="mt-2 h-10 w-40" />
      ) : (
        <p className="mt-1 text-[2rem] font-bold leading-tight tabular-nums tracking-tight text-text-primary">
          {formatCurrency(balance, defaultCurrency)}
        </p>
      )}
      <p className="mt-1 text-xs text-text-tertiary">All accounts · {defaultCurrency}</p>
    </section>
  )
}
