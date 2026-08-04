'use client'

import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, PiggyBank, Receipt, TrendingUp, Wallet } from 'lucide-react'
import { FAB } from '@/components/nav/fab'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { CategoryIcon } from '@/components/ui/category-icon'
import { Select } from '@/components/ui/select'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { formatCurrency } from '@/lib/currency/format'
import { cn } from '@/lib/utils'
import { useSettings } from '@/providers/settings-provider'
import { useCategories } from '@/hooks/use-categories'
import { useSummary, type CategoryBreakdownItem, type SummaryRange } from '@/hooks/use-summary'

type Scope = 'month' | 'year' | 'all'

const SCOPE_OPTIONS = [
  { value: 'month' as const, label: 'Month' },
  { value: 'year' as const, label: 'Year' },
  { value: 'all' as const, label: 'All time' },
]

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

/** Build the last 6 year options. */
function buildYearOptions() {
  const current = new Date().getFullYear()
  return Array.from({ length: 6 }, (_, i) => current - i)
}

export default function SummaryPage() {
  const monthOptions = useMemo(() => buildMonthOptions(), [])
  const yearOptions = buildYearOptions()

  const [scope, setScope] = useState<Scope>('month')
  const [monthKey, setMonthKey] = useState(monthOptions[0].key)
  const [year, setYear] = useState(yearOptions[0])

  const { defaultCurrency } = useSettings()
  const { categories } = useCategories()

  const { range, periodLabel } = useMemo<{ range: SummaryRange; periodLabel: string }>(() => {
    if (scope === 'all') {
      return {
        range: { start: -Infinity, end: Infinity, hasOpening: false },
        periodLabel: 'All time',
      }
    }
    if (scope === 'year') {
      return {
        range: { start: Date.UTC(year, 0, 1), end: Date.UTC(year + 1, 0, 1), hasOpening: true },
        periodLabel: String(year),
      }
    }
    const [y, m] = monthKey.split('-').map(Number)
    return {
      range: { start: Date.UTC(y, m - 1, 1), end: Date.UTC(y, m, 1), hasOpening: true },
      periodLabel: monthOptions.find((o) => o.key === monthKey)?.label ?? '',
    }
  }, [scope, monthKey, year, monthOptions])

  const { data, loading } = useSummary(range)

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
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Summary</h1>
        <p className="text-sm text-text-secondary">{periodLabel}</p>
      </div>

      {/* Scope + period picker */}
      <div className="space-y-3">
        <SegmentedControl value={scope} onChange={(s) => setScope(s)} options={SCOPE_OPTIONS} />
        {scope === 'month' && (
          <Select name="month" value={monthKey} onChange={(e) => setMonthKey(e.target.value)}>
            {monthOptions.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </Select>
        )}
        {scope === 'year' && (
          <Select name="year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-[var(--radius-lg)]" />
          <div className="grid grid-cols-4 gap-3">
            <Skeleton className="h-16 rounded-[var(--radius-md)]" />
            <Skeleton className="h-16 rounded-[var(--radius-md)]" />
            <Skeleton className="h-16 rounded-[var(--radius-md)]" />
            <Skeleton className="h-16 rounded-[var(--radius-md)]" />
          </div>
        </div>
      ) : (
        <>
          {/* Classic income / expense / savings summary */}
          <IncomeExpenseSavings income={data.income} expense={data.expense} exchange={data.exchange} savings={data.savings} fmt={fmt} />

          {/* Opening / closing balance (not meaningful for "all time") */}
          {range.hasOpening && (
            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-[var(--radius-md)] border border-border bg-surface px-3.5 py-3 shadow-[var(--shadow-sm)]">
                <p className="text-xs text-text-secondary">Opening balance</p>
                <p className="mt-1 text-base font-semibold tabular-nums text-text-primary">{fmt(data.openingBalance)}</p>
                <p className="mt-0.5 text-[0.6875rem] text-text-tertiary">Start of {periodLabel}</p>
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
                <p className="mt-0.5 text-[0.6875rem] text-text-tertiary">End of {periodLabel}</p>
              </div>
            </section>
          )}

          {!hasData ? (
            <EmptyState
              icon={<TrendingUp className="size-6" />}
              title="No activity in this period"
              description="No income, expenses, or exchanges were recorded here."
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

function IncomeExpenseSavings({
  income,
  expense,
  exchange,
  savings,
  fmt,
}: {
  income: number
  expense: number
  exchange: number
  savings: number
  fmt: (v: number) => string
}) {
  const cell = (label: string, value: number, tone: 'income' | 'expense' | 'exchange' | 'neutral') => (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface px-3 py-3 shadow-[var(--shadow-sm)]">
      <p className="text-xs text-text-secondary">{label}</p>
      <p
        className={cn(
          'mt-1 text-base font-semibold tabular-nums',
          tone === 'income' && 'text-income',
          tone === 'expense' && 'text-expense',
          tone === 'exchange' && 'text-exchange',
          tone === 'neutral' && savings < 0 && 'text-expense',
          tone === 'neutral' && savings >= 0 && 'text-text-primary'
        )}
      >
        {fmt(value)}
      </p>
    </div>
  )
  return (
    <section className="grid grid-cols-4 gap-3">
      {cell('Income', income, 'income')}
      {cell('Expense', expense, 'expense')}
      {cell('Exchange', exchange, 'exchange')}
      {cell('Savings', savings, 'neutral')}
    </section>
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
  tone: 'income' | 'expense' | 'exchange'
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
                  tone === 'income' ? 'bg-income-soft text-income' : tone === 'expense' ? 'bg-expense-soft text-expense' : 'bg-exchange-soft text-exchange'
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
                className={cn('h-full rounded-full', tone === 'income' ? 'bg-income' : tone === 'expense' ? 'bg-expense' : 'bg-exchange')}
                style={{ width: `${Math.max(item.share * 100, 2)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
