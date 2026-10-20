'use client'

import { ArrowDownLeft, ArrowUpRight, Eye, EyeOff } from 'lucide-react'
import { Amount } from '@/components/ui/amount'
import { useSettings } from '@/providers/settings-provider'
import { useBalanceVisibility } from '@/providers/balance-visibility-provider'

interface BalanceCardProps {
  balance: number
  loading?: boolean
  /** This calendar month, in the display currency. */
  month?: { income: number; expense: number; rate: number | null; label: string }
}

function SavingsRing({ rate }: { rate: number }) {
  const clamped = Math.max(0, Math.min(1, rate))
  const r = 16
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 40 40" className="size-11 -rotate-90" aria-hidden>
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="4" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke="var(--gold-300)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${clamped * c} ${c}`}
        className="transition-[stroke-dasharray] duration-700 ease-out"
      />
    </svg>
  )
}

/** The Home hero: total balance, the privacy toggle, and this month at a glance. */
export function BalanceCard({ balance, loading, month }: BalanceCardProps) {
  const { defaultCurrency } = useSettings()
  const { hidden, toggle } = useBalanceVisibility()

  return (
    <section aria-label="Balance" className="hero-panel gold-hairline relative overflow-hidden rounded-[var(--radius-xl)] p-5 shadow-[var(--shadow-lg)] md:p-7">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-hero-muted">Total balance</p>
          {loading ? (
            <div className="mt-2 h-10 w-48 animate-pulse rounded-[var(--radius-md)] bg-white/15" />
          ) : (
            <Amount
              value={balance}
              currency={defaultCurrency}
              masked={hidden}
              className="mt-1 text-[2.125rem] font-semibold leading-tight tracking-tight md:text-[2.75rem]"
              currencyClassName="text-[0.5em] font-medium opacity-70"
            />
          )}
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label={hidden ? 'Show balances' : 'Hide balances'}
          aria-pressed={!hidden}
          className="pressable -mr-1.5 -mt-1.5 flex size-11 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
        >
          {hidden ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
        </button>
      </div>

      {month && !loading && (
        <div className="mt-6 flex items-center gap-4 border-t border-white/10 pt-4">
          <dl className="min-w-0 flex-1 space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-[0.06em] text-hero-muted">{month.label}</p>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-sm text-hero-muted">
                <ArrowDownLeft className="size-3.5 text-[var(--green-400)]" aria-hidden /> In
              </dt>
              <dd className="min-w-0 truncate">
                <Amount value={month.income} currency={defaultCurrency} masked={hidden} className="text-[0.9375rem] font-semibold" />
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-sm text-hero-muted">
                <ArrowUpRight className="size-3.5 text-[var(--red-400)]" aria-hidden /> Out
              </dt>
              <dd className="min-w-0 truncate">
                <Amount value={month.expense} currency={defaultCurrency} masked={hidden} className="text-[0.9375rem] font-semibold" />
              </dd>
            </div>
          </dl>
          {month.rate !== null && (
            <div className="flex shrink-0 flex-col items-center gap-1 border-l border-white/10 pl-4">
              <div className="relative">
                <SavingsRing rate={month.rate} />
                <span className="absolute inset-0 flex items-center justify-center text-[0.6875rem] font-semibold">
                  {Math.round(Math.max(-99, Math.min(100, month.rate * 100)))}%
                </span>
              </div>
              <span className="text-xs text-hero-muted">saved</span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
