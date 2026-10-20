'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Amount } from '@/components/ui/amount'
import { CategoryIcon } from '@/components/ui/category-icon'
import { SectionHeader } from '@/components/ui/list'
import { cn } from '@/lib/utils'
import type { CategoryTotal } from '@/lib/activity'
import type { Category } from '@/lib/types'
import type { PersonWithBalance } from '@/hooks/use-people'

/** Top spending categories this month, each a link into Activity. */
export function SpendingGlance({
  totals,
  categories,
  currency,
  month,
  monthLabel,
}: {
  totals: CategoryTotal[]
  categories: Category[]
  currency: string
  month: string
  monthLabel: string
}) {
  if (totals.length === 0) return null
  const byId = new Map(categories.map((c) => [c.$id, c]))
  const top = totals.slice(0, 5)
  const max = top[0]?.amount || 1
  return (
    <section aria-label={`Spending in ${monthLabel}`}>
      <SectionHeader
        title={`Spending · ${monthLabel}`}
        action={
          <Link href="/app/summary" className="flex min-h-11 items-center gap-0.5 rounded-[var(--radius-md)] px-2 text-sm font-semibold text-accent hover:bg-accent-soft">
            Insights <ChevronRight className="size-4" aria-hidden />
          </Link>
        }
      />
      <div className="space-y-1 rounded-[var(--radius-lg)] bg-surface p-2 shadow-[var(--shadow-sm)] ring-1 ring-border">
        {top.map((row) => {
          const category = byId.get(row.categoryId)
          return (
            <Link
              key={row.categoryId}
              href={`/app/transactions?type=expense&category=${row.categoryId}&month=${month}`}
              className="block rounded-[var(--radius-md)] px-2.5 py-2 transition-colors hover:bg-surface-hover"
            >
              <div className="flex items-center gap-2.5">
                <CategoryIcon name={category?.icon} className="size-4 shrink-0 text-text-secondary" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{category?.name ?? 'Uncategorized'}</span>
                <Amount value={row.amount} currency={currency} className="text-sm font-semibold" />
                <span className="w-9 text-right text-xs tabular-nums text-text-tertiary">{Math.round(row.share * 100)}%</span>
              </div>
              <div className="ml-[1.625rem] mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                <div className="h-full rounded-full bg-[var(--navy-700)] [[data-theme=dark]_&]:bg-accent" style={{ width: `${(row.amount / max) * 100}%` }} />
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

/** Who owes whom, in one card. */
export function PeopleGlance({ people, currency }: { people: PersonWithBalance[]; currency: string }) {
  const open = people.filter((p) => p.balance !== 0).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
  if (open.length === 0) return null
  // balance < 0 means they owe you (see usePeople).
  const owedToYou = open.filter((p) => p.balance < 0).reduce((s, p) => s - p.balance, 0)
  const youOwe = open.filter((p) => p.balance > 0).reduce((s, p) => s + p.balance, 0)
  return (
    <section aria-label="People">
      <SectionHeader
        title="People"
        action={
          <Link href="/app/people" className="flex min-h-11 items-center gap-0.5 rounded-[var(--radius-md)] px-2 text-sm font-semibold text-accent hover:bg-accent-soft">
            All <ChevronRight className="size-4" aria-hidden />
          </Link>
        }
      />
      <div className="rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-sm)] ring-1 ring-border">
        <div className="grid grid-cols-2 divide-x divide-border border-b border-border py-3 text-center">
          <div>
            <p className="text-xs text-text-tertiary">Owed to you</p>
            <Amount value={owedToYou} currency={currency} tone="income" className="text-[0.9375rem] font-semibold" />
          </div>
          <div>
            <p className="text-xs text-text-tertiary">You owe</p>
            <Amount value={youOwe} currency={currency} tone={youOwe ? 'expense' : 'muted'} className="text-[0.9375rem] font-semibold" />
          </div>
        </div>
        {open.slice(0, 3).map((p) => (
          <Link key={p.$id} href={`/app/people/${p.$id}`} className="flex min-h-12 items-center gap-3 px-4 py-2 transition-colors hover:bg-surface-hover">
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{p.name}</span>
            <span className={cn('text-xs', p.balance < 0 ? 'text-income' : 'text-expense')}>{p.balance < 0 ? 'owes you' : 'you owe'}</span>
            <Amount value={Math.abs(p.balance)} currency={currency} className="text-sm font-semibold" />
          </Link>
        ))}
      </div>
    </section>
  )
}
