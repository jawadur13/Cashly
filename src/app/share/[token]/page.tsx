'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowDownRight, ArrowUpRight, Users } from 'lucide-react'
import { formatMoney, formatSignedMoney, formatDateTime } from '@/lib/currency/format'
import { convertMinor } from '@/lib/currency/currencies'
import { useExchangeRates } from '@/hooks/use-exchange-rates'
import { Loader } from '@/components/ui/loader'
import { cn } from '@/lib/utils'

interface TxSnapshot { type: string; amountMinor: number; currency: string; date: string; note: string }

export default function SharePage() {
  const params = useParams<{ token: string }>()
  const { rates } = useExchangeRates()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [personName, setPersonName] = useState('')
  const [sharedByName, setSharedByName] = useState('')
  const [currency, setCurrency] = useState('BDT')
  const [transactions, setTransactions] = useState<TxSnapshot[]>([])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch(`/api/share/${params.token}`)
        if (!res.ok) throw new Error('Share link invalid or expired')
        const share = await res.json()
        if (!active) return
        setPersonName(share.personName)
        setSharedByName(share.sharedByName)
        setCurrency(share.currency)
        setTransactions(share.transactions)
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Share link invalid or expired')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [params.token])

  const converted = useMemo(
    () => transactions.map((t) => ({ ...t, amountMinor: convertMinor(t.amountMinor, t.currency, currency, rates), currency })),
    [transactions, currency, rates]
  )

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Loader text="Loading..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-3 bg-bg px-4 text-center">
        <Users className="size-10 text-text-tertiary" />
        <p className="text-sm font-medium text-text-primary">Link not found</p>
        <p className="text-xs text-text-secondary">This share link may have been removed or is invalid.</p>
        <MarketingFooter />
      </div>
    )
  }

  const balance = converted.reduce((sum, t) => {
    if (t.type === 'give') return sum + t.amountMinor
    if (t.type === 'take') return sum - t.amountMinor
    return sum
  }, 0)

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-bg px-4 py-6">
      <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
        <p className="text-sm text-text-secondary">Shared summary for</p>
        <h1 className="mt-1 text-xl font-bold text-text-primary">{personName}</h1>
        <div className={cn(
          'mt-3 text-3xl font-bold tabular-nums tracking-tight',
          balance > 0 && 'text-expense',
          balance < 0 && 'text-income',
          balance === 0 && 'text-text-primary'
        )}>
          {formatMoney(Math.abs(balance), currency)}
        </div>
        <p className={cn(
          'mt-1 text-sm font-medium',
          balance > 0 && 'text-expense',
          balance < 0 && 'text-income',
          balance === 0 && 'text-text-tertiary'
        )}>
          {balance > 0 ? 'You owe' : balance < 0 ? 'You are owed' : 'Settled'}
        </p>
        {sharedByName && <p className="mt-2 text-sm text-text-secondary">Shared by {sharedByName}</p>}
      </section>

      <section className="mt-6 space-y-1">
        <h2 className="mb-2 text-sm font-semibold text-text-primary">
          Transaction history ({converted.length})
        </h2>
        {converted.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-tertiary">No transactions recorded.</p>
        ) : (
          converted.map((t, i) => {
            const isGive = t.type === 'give'
            const label = isGive ? 'Received' : 'Sent'
            const tone = isGive ? 'income' : 'expense'
            const iconColor = isGive ? 'bg-income-soft text-income' : 'bg-expense-soft text-expense'
            const Icon = isGive ? ArrowDownRight : ArrowUpRight
            const amountColor = isGive ? 'text-income' : 'text-expense'
            return (
              <div key={i} className="flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2.5">
                <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', iconColor)}>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-primary">{label}</span>
                  <span className="block text-xs text-text-tertiary">
                    {formatDateTime(t.date)}{t.note ? ` · ${t.note}` : ''}
                  </span>
                </span>
                <span className={cn('shrink-0 text-sm font-semibold tabular-nums', amountColor)}>
                  {formatSignedMoney(t.amountMinor, t.currency, tone)}
                </span>
              </div>
            )
          })
        )}
      </section>

      <MarketingFooter />
    </div>
  )
}

function MarketingFooter() {
  return (
    <footer className="mt-8 w-full pb-8 text-center">
      <p className="text-xs text-text-tertiary">
        Shared via Cashly · {new Date().toLocaleDateString()}
      </p>
      <div className="mt-4 rounded-[var(--radius-md)] border border-border bg-surface p-4 text-center">
        <p className="text-sm font-medium text-text-primary">
          Track your own money with Cashly
        </p>
        <p className="mt-1 text-xs text-text-secondary">
          The easiest way to manage income, expenses, and people.
        </p>
        <a
          href="https://cashly.mvp.bd"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          Try Cashly free
        </a>
      </div>
    </footer>
  )
}
