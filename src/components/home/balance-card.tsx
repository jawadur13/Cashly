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
    <section className="hero-panel card-lift overflow-hidden rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-md)] md:p-6">
      <p className="text-sm font-medium text-white/70">Current balance</p>
      {loading ? (
        <Skeleton className="mt-2 h-10 w-40 bg-white/20" />
      ) : (
        <div className="mt-1 flex min-w-0 items-center gap-2">
          <MaskedAmount
            amount={balance}
            currency={defaultCurrency}
            masked={hidden}
            className="min-w-0 flex-1 break-words text-[1.65rem] font-bold leading-tight tabular-nums tracking-tight text-white md:text-[2rem]"
          />
          <button
            type="button"
            onClick={() => (hidden ? reveal() : hide())}
            aria-label={hidden ? 'Show balance' : 'Hide balance'}
            className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
          >
            {hidden ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
          </button>
        </div>
      )}
      <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80">All accounts · {defaultCurrency}</p>
    </section>
  )
}
