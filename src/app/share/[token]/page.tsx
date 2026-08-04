'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowDownRight, ArrowUpRight, Users } from 'lucide-react'
import { getPersonByShareToken, listTransactions } from '@/lib/appwrite/collections'
import { formatCurrency, formatDateTime, formatSignedAmount } from '@/lib/currency/format'
import { Loader } from '@/components/ui/loader'
import { cn } from '@/lib/utils'
import type { Person, Transaction } from '@/lib/types'

export default function SharePage() {
  const params = useParams<{ token: string }>()
  const [person, setPerson] = useState<Person | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const p = await getPersonByShareToken(params.token)
        if (!active) return
        setPerson(p)

        const all: Transaction[] = []
        let offset = 0
        const PAGE = 100
        while (true) {
          const res = await listTransactions({ userId: p.userId, personId: p.$id, limit: PAGE, offset })
          all.push(...res.documents)
          offset += res.documents.length
          if (res.documents.length < PAGE) break
        }
        if (active) {
          setTransactions(all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Share link invalid or expired')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [params.token])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Loader text="Loading..." />
      </div>
    )
  }

  if (error || !person) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-4 text-center">
        <Users className="size-10 text-text-tertiary" />
        <p className="text-sm font-medium text-text-primary">Link not found</p>
        <p className="text-xs text-text-secondary">This share link may have been removed or is invalid.</p>
      </div>
    )
  }

  const balance = transactions.reduce((sum, t) => {
    if (t.type === 'give') return sum + t.amount
    if (t.type === 'take') return sum - t.amount
    return sum
  }, 0)

  // Same number, flipped interpretation: +700 means "they owe you" for user, "you owe" for friend
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-bg px-4 py-6">
      <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
        <p className="text-sm text-text-secondary">Shared summary for</p>
        <h1 className="mt-1 text-xl font-bold text-text-primary">{person.name}</h1>
        <div className={cn(
          'mt-3 text-3xl font-bold tabular-nums tracking-tight',
          balance > 0 && 'text-expense',
          balance < 0 && 'text-income',
          balance === 0 && 'text-text-primary'
        )}>
          {formatCurrency(Math.abs(balance), 'BDT')}
        </div>
        <p className={cn(
          'mt-1 text-sm font-medium',
          balance > 0 && 'text-expense',
          balance < 0 && 'text-income',
          balance === 0 && 'text-text-tertiary'
        )}>
          {balance > 0 ? 'You owe' : balance < 0 ? 'You are owed' : 'Settled'}
        </p>
        {person.note && <p className="mt-2 text-sm text-text-secondary">{person.note}</p>}
      </section>

      <section className="mt-6 space-y-1">
        <h2 className="mb-2 text-sm font-semibold text-text-primary">
          Transaction history ({transactions.length})
        </h2>
        {transactions.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-tertiary">No transactions recorded.</p>
        ) : (
          transactions.map((t) => {
            // From friend's perspective: user's Give = friend Received, user's Take = friend Sent
            const isGive = t.type === 'give'
            const label = isGive ? 'Received' : 'Sent'
            const tone = isGive ? 'income' : 'expense'
            const iconColor = isGive ? 'bg-income-soft text-income' : 'bg-expense-soft text-expense'
            const Icon = isGive ? ArrowDownRight : ArrowUpRight
            const amountColor = isGive ? 'text-income' : 'text-expense'
            return (
              <div key={t.$id} className="flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2.5">
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
                  {formatSignedAmount(t.amount, t.currency, tone)}
                </span>
              </div>
            )
          })
        )}
      </section>

      <footer className="mt-8 pb-8 text-center">
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
    </div>
  )
}
