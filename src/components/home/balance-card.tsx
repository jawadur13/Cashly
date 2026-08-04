'use client'

import { Eye, EyeOff } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { MaskedAmount } from '@/components/ui/masked-amount'
import { useSettings } from '@/providers/settings-provider'
import { useBalanceVisibility } from '@/providers/balance-visibility-provider'

interface BalanceCardProps {
  balance: number
  loading?: boolean
}

export function BalanceCard({ balance, loading }: BalanceCardProps) {
  const { defaultCurrency } = useSettings()
  const { hidden, reveal, hide } = useBalanceVisibility()
  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
      <p className="text-sm text-text-secondary">Current balance</p>
      {loading ? (
        <Skeleton className="mt-2 h-10 w-40" />
      ) : (
        <div className="mt-1 flex items-center gap-2">
          <MaskedAmount
            amount={balance}
            currency={defaultCurrency}
            masked={hidden}
            className="text-[2rem] font-bold leading-tight tabular-nums tracking-tight text-text-primary"
          />
          <button
            type="button"
            onClick={() => (hidden ? reveal() : hide())}
            aria-label={hidden ? 'Show balance' : 'Hide balance'}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            {hidden ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
          </button>
        </div>
      )}
      <p className="mt-1 text-xs text-text-tertiary">All accounts · {defaultCurrency}</p>
    </section>
  )
}
