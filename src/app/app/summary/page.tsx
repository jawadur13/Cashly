'use client'

import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, PiggyBank, Receipt, TrendingUp, Wallet } from 'lucide-react'
import { FAB } from '@/components/nav/fab'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { CategoryIcon } from '@/components/ui/category-icon'
import { Select } from '@/components/ui/select'
import { formatCurrency } from '@/lib/currency/format'
import { cn } from '@/lib/utils'
import { useSettings } from '@/providers/settings-provider'
import { useCategories } from '@/hooks/use-categories'
import { useSummary, type CategoryBreakdownItem } from '@/hooks/use-summary'

/** Build the last 24 month options as { key: 'YYYY-MM', label: 'Month YYYY' }. */
function buildMonthOptions() {
  const now = new Date()
  const options: { key: string; label: string }[] = []
  for (let i = 0; i < 24; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString(undefined, { month: 'long', year: 'numeric' })
    options.push({ key, label })
  }
  return options
}

export default function SummaryPage() {
  const monthOptions = useMemo(() => buildMonthOptions(), [])
  const [monthKey, setMonthKey] = useState(monthOptions[0].key)
  const { defaultCurrency } = useSettings()
  const { categories } = useCategories()
  const { data, loading } = useSummary(monthKey)

  const monthLabel = monthOptions.find((m) => m.key === monthKey)?.label ?? ''

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.$id, c]))
    return (id: string) => map.get(id)?.name ?? 'Uncategorized'
  }, [categories])
  const categoryIcon = useMemo(() => {
    const map = new Map(categories.map((c) => [c.$id, c]))
    return (id: string) => map.get(id)?.icon
  }, [categories])

  const fmt = (v: number) => formatCurrency(v, defaultCurrency)
  const hasData = data.transactionCount > 0

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Summary</h1>
          <p className="text-sm text-text-secondary">{monthLabel}</p>
        </div>
        <div className="w-40">
          <Select name="month" value={monthKey} onChange={(e) => setMonthKey(e.target.value)}>
            {monthOptions.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-[var(--radius-lg)]" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20 rounded-[var(--radius-md)]" />
            <Skeleton className="h-20 rounded-[var(--radius-md)]" />
          </div>
        </div>
      ) : (
        <>
          {/* Opening / closing balance */}
          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-md)] border border-border bg-surface px-3.5 py-3 shadow-[var(--shadow-sm)]">
              <p className="text-xs text-text-secondary">Opening balance</p>
              <p className="mt-1 text-base font-semibold tabular-nums text-text-primary">{fmt(data.openingBalance)}</p>
              <p className="mt-0.5 text-[0.6875rem] text-text-tertiary">Start of {monthLabel}</p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-surface px-3.5 py-3 shadow-[var(--shadow-sm)]">
              <p className="text-xs text-text-secondary">Closing balance</p>
              <p
                className={cn(
                  'mt-1 text-base font-semibold tabular-nums',
                  data.closingBalance >= data.openingBalance ? 'text-text-primary' : 'text-expense'
                )}
              >
                {fmt(data.closingBalance)}
              </p>
              <p className="mt-0.5 text-[0.6875rem] text-text-tertiary">End of {monthLabel}</p>
            </div>
          </section>

          {!hasData ? (
            <EmptyState
              icon={<TrendingUp className="size-6" />}
              title="No activity in this month"
              description="No income or expenses were recorded in this period."
            />
          ) : (
            <>
              {/* Net savings hero */}
              <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-text-secondary">Net savings</p>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      data.savings >= 0 ? 'bg-income-soft text-income' : 'bg-expense-soft text-expense'
                    )}
                  >
                    {(data.savingsRate * 100).toFixed(0)}% saved
                  </span>
                </div>
                <p
                  className={cn(
                    'mt-1 text-[1.75rem] font-bold tabular-nums tracking-tight',
                    data.savings >= 0 ? 'text-text-primary' : 'text-expense'
                  )}
                >
                  {fmt(data.savings)}
                </p>
                <div className="mt-3 flex gap-4 text-sm">
                  <span className="inline-flex items-center gap-1 text-income">
                    <ArrowUpRight className="size-4" /> {fmt(data.income)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-expense">
                    <ArrowDownRight className="size-4" /> {fmt(data.expense)}
                  </span>
                </div>
              </section>

              {/* Key stats */}
              <section className="grid grid-cols-2 gap-3">
                <StatTile icon={<Receipt className="size-4" />} label="Transactions" value={String(data.transactionCount)} />
                <StatTile icon={<Wallet className="size-4" />} label="Avg. expense" value={fmt(data.avgExpense)} />
                <StatTile icon={<ArrowUpRight className="size-4" />} label="Avg. income" value={fmt(data.avgIncome)} />
                <StatTile icon={<PiggyBank className="size-4" />} label="Largest expense" value={fmt(data.largestExpense)} />
              </section>

              {/* Spending by category */}
              <Breakdown
                title="Top spending"
                items={data.expenseByCategory.slice(0, 6)}
                tone="expense"
                fmt={fmt}
                name={categoryName}
                icon={categoryIcon}
              />

              {/* Income sources */}
              <Breakdown
                title="Income sources"
                items={data.incomeByCategory.slice(0, 6)}
                tone="income"
                fmt={fmt}
                name={categoryName}
                icon={categoryIcon}
              />
            </>
          )}
        </>
      )}

      <FAB />
    </div>
  )
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface px-3.5 py-3 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-1.5 text-text-secondary">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-base font-semibold tabular-nums text-text-primary">{value}</p>
    </div>
  )
}

interface BreakdownProps {
  title: string
  items: CategoryBreakdownItem[]
  tone: 'income' | 'expense'
  fmt: (v: number) => string
  name: (id: string) => string
  icon: (id: string) => string | undefined
}

function Breakdown({ title, items, tone, fmt, name, icon }: BreakdownProps) {
  if (items.length === 0) return null
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
      <div className="space-y-2 rounded-[var(--radius-md)] border border-border bg-surface p-3 shadow-[var(--shadow-sm)]">
        {items.map((item) => (
          <div key={item.categoryId} className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full',
                  tone === 'income' ? 'bg-income-soft text-income' : 'bg-expense-soft text-expense'
                )}
              >
                <CategoryIcon name={icon(item.categoryId)} className="size-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                {name(item.categoryId)}
              </span>
              <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-text-primary">
                {fmt(item.amount)}
                <span className="ml-1 text-xs font-normal text-text-tertiary">
                  {(item.share * 100).toFixed(0)}%
                </span>
              </span>
            </div>
            <div className="ml-[2.625rem] h-1.5 overflow-hidden rounded-full bg-surface-hover">
              <div
                className={cn('h-full rounded-full', tone === 'income' ? 'bg-income' : 'bg-expense')}
                style={{ width: `${Math.max(item.share * 100, 2)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
