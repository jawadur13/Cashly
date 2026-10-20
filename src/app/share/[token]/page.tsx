'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, CloudOff, Link2Off, RotateCw } from 'lucide-react'
import { Logo, LogoMark } from '@/components/brand/logo'
import { Amount } from '@/components/ui/amount'
import { Button, BUTTON_BASE, BUTTON_SIZES, BUTTON_VARIANTS } from '@/components/ui/button'
import { formatDateTime } from '@/lib/currency/format'
import { convertMinor } from '@/lib/currency/currencies'
import { useExchangeRates } from '@/hooks/use-exchange-rates'
import { cn } from '@/lib/utils'

interface TxSnapshot {
  type: string
  amountMinor: number
  currency: string
  date: string
  note: string
}

interface Share {
  asOf?: string
  personName: string
  sharedByName: string
  currency: string
  transactions: TxSnapshot[]
}

type State = { kind: 'loading' } | { kind: 'missing' } | { kind: 'error' } | { kind: 'ready'; share: Share }

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="hero-panel min-h-dvh px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex justify-center text-white">
          <Logo markClassName="size-8" />
        </div>
        {children}
      </div>
    </div>
  )
}

function Promo() {
  return (
    <div className="mt-8 rounded-[var(--radius-xl)] bg-white/[0.07] p-5 text-center ring-1 ring-inset ring-white/15">
      <p className="font-semibold text-white">Keep track of your own money</p>
      <p className="mt-1 text-sm text-white/70">Accounts, spending and who owes whom — clear and private.</p>
      <Link href="/" className={cn(BUTTON_BASE, BUTTON_VARIANTS.gold, BUTTON_SIZES.sm, 'mt-4')}>
        Try Cashly free
      </Link>
    </div>
  )
}

/** A friend's live view of their give/get history with the person who shared it. */
export default function SharePage() {
  const params = useParams<{ token: string }>()
  const { rates } = useExchangeRates()
  const [state, setState] = useState<State>({ kind: 'loading' })

  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      const res = await fetch(`/api/share/${params.token}`, { cache: 'no-store' })
      if (res.status === 404) return setState({ kind: 'missing' })
      if (!res.ok) return setState({ kind: 'error' })
      setState({ kind: 'ready', share: (await res.json()) as Share })
    } catch {
      setState({ kind: 'error' })
    }
  }, [params.token])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const share = state.kind === 'ready' ? state.share : null
  const converted = useMemo(
    () =>
      share
        ? share.transactions.map((t) => ({
            ...t,
            amountMinor: convertMinor(t.amountMinor, t.currency, share.currency, rates),
            currency: share.currency,
          }))
        : [],
    [share, rates]
  )

  if (state.kind === 'loading') {
    return (
      <Shell>
        <div className="flex justify-center py-24" aria-busy="true">
          <LogoMark className="size-12 animate-[pulse-scale_1.6s_ease-in-out_infinite]" />
        </div>
      </Shell>
    )
  }

  if (state.kind === 'missing' || state.kind === 'error') {
    const missing = state.kind === 'missing'
    return (
      <Shell>
        <div className="rounded-[var(--radius-xl)] bg-surface-raised p-8 text-center shadow-[var(--shadow-lg)]">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-surface-sunken text-text-secondary">
            {missing ? <Link2Off className="size-6" /> : <CloudOff className="size-6" />}
          </span>
          <h1 className="mt-4 text-lg font-semibold text-text-primary">{missing ? 'This link has been turned off' : "Couldn't load this summary"}</h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            {missing ? 'The person who shared it stopped sharing, or the link is mistyped.' : 'Check your connection and try again.'}
          </p>
          {!missing && (
            <Button variant="secondary" className="mt-5" onClick={load}>
              <RotateCw className="size-4" /> Try again
            </Button>
          )}
        </div>
        <Promo />
      </Shell>
    )
  }

  const s = state.share
  // give = the sharer gave money to this person; take = the sharer received it.
  // Positive means the viewer (the person) owes the sharer.
  const balance = converted.reduce((sum, t) => (t.type === 'give' ? sum + t.amountMinor : t.type === 'take' ? sum - t.amountMinor : sum), 0)
  const sharer = s.sharedByName || 'They'

  return (
    <Shell>
      <section className="text-center text-white">
        <p className="text-sm text-white/70">
          {s.sharedByName ? `${s.sharedByName} shared this with ${s.personName}` : `Shared with ${s.personName}`}
        </p>
        <p className="mt-4 text-sm font-medium text-white/80">
          {balance > 0 ? `You owe ${sharer}` : balance < 0 ? `${sharer} owes you` : "You're all settled"}
        </p>
        <Amount value={Math.abs(balance)} currency={s.currency} className="mt-1 text-[2.75rem] font-semibold leading-tight tracking-tight" currencyClassName="text-[0.45em] opacity-70" />
        {s.asOf && <p className="mt-2 text-xs text-white/55">Live as of {formatDateTime(s.asOf)}</p>}
      </section>

      <section className="mt-8 overflow-hidden rounded-[var(--radius-xl)] bg-surface-raised shadow-[var(--shadow-lg)]" aria-label="History">
        <h2 className="border-b border-border px-5 py-4 text-sm font-semibold text-text-primary">
          History · {converted.length}
        </h2>
        {converted.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-text-tertiary">Nothing recorded yet.</p>
        ) : (
          <ul>
            {converted.map((t, i) => {
              const youReceived = t.type === 'give'
              return (
                <li key={i} className={cn('flex items-center gap-3 px-5 py-3.5', i > 0 && 'border-t border-border')}>
                  <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)]', youReceived ? 'bg-income-soft text-income' : 'bg-expense-soft text-expense')}>
                    {youReceived ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text-primary">{youReceived ? 'You received' : 'You paid'}</span>
                    <span className="block truncate text-xs text-text-tertiary">
                      {formatDateTime(t.date)}
                      {t.note ? ` · ${t.note}` : ''}
                    </span>
                  </span>
                  <Amount value={youReceived ? t.amountMinor : -t.amountMinor} currency={t.currency} showPlus tone={youReceived ? 'income' : 'neutral'} className="text-sm font-semibold" />
                </li>
              )
            })}
          </ul>
        )}
      </section>
      <Promo />
    </Shell>
  )
}
