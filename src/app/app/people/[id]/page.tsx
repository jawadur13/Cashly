'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { TransactionList } from '@/components/transactions/transaction-list'
import { Loader } from '@/components/ui/loader'
import { formatCurrency } from '@/lib/currency/format'
import { useAuth } from '@/providers/auth-provider'
import { useSettings } from '@/providers/settings-provider'
import { useCategories } from '@/hooks/use-categories'
import { useAccounts } from '@/hooks/use-accounts'
import { usePeople } from '@/hooks/use-people'
import { listTransactions } from '@/lib/appwrite/collections'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/lib/types'

export default function PersonDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const { defaultCurrency } = useSettings()
  const { categories } = useCategories()
  const { accounts } = useAccounts()
  const { people, loading: peopleLoading } = usePeople()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const person = useMemo(() => people.find((p) => p.$id === params.id), [people, params.id])

  useEffect(() => {
    if (!user || !params.id) return
    let active = true
    setLoading(true)
    const PAGE_SIZE = 100
    ;(async () => {
      const all: Transaction[] = []
      let offset = 0
      while (true) {
        const res = await listTransactions({ userId: user.$id, personId: params.id, limit: PAGE_SIZE, offset })
        all.push(...res.documents)
        offset += res.documents.length
        if (res.documents.length < PAGE_SIZE) break
      }
      if (active) setTransactions(all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
      if (active) setLoading(false)
    })()
    return () => { active = false }
  }, [user, params.id])

  if (peopleLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (!person) {
    return (
      <div className="space-y-5">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary">
          <ChevronLeft className="size-4" /> Back
        </button>
        <p className="text-sm text-text-tertiary">Person not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <button onClick={() => router.push('/app/people')} className="flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary">
        <ChevronLeft className="size-4" /> Back
      </button>

      <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
        <h1 className="text-lg font-semibold text-text-primary">{person.name}</h1>
        <div className={cn(
          'mt-2 text-2xl font-bold tabular-nums tracking-tight',
          person.balance > 0 && 'text-income',
          person.balance < 0 && 'text-expense',
          person.balance === 0 && 'text-text-primary'
        )}>
          {person.balance === 0 ? formatCurrency(0, defaultCurrency) : formatCurrency(person.balance, defaultCurrency)}
        </div>
        <p className={cn(
          'mt-1 flex items-center gap-1 text-sm',
          person.status === 'they-owe' && 'text-income',
          person.status === 'you-owe' && 'text-expense',
          person.status === 'settled' && 'text-text-tertiary'
        )}>
          {person.status === 'they-owe' && <><ArrowUpRight className="size-4" /> They owe you</>}
          {person.status === 'you-owe' && <><ArrowDownRight className="size-4" /> You owe them</>}
          {person.status === 'settled' && 'Settled'}
        </p>
        {person.note && <p className="mt-2 text-sm text-text-secondary">{person.note}</p>}
      </section>

      <TransactionList
        transactions={transactions}
        categories={categories}
        accounts={accounts}
        people={people}
        loading={loading}
        onSelect={(id) => router.push(`/app/transactions/${id}`)}
        emptyTitle="No transactions yet"
        emptyDescription="No give or take recorded with this person."
      />
    </div>
  )
}
