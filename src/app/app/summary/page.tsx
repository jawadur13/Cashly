'use client'

import { useMemo, useState } from 'react'
import {
  ArrowDownRight, ArrowUpRight, Receipt, TrendingUp,
  Users, Calendar, Zap, BarChart3,
} from 'lucide-react'
import { FAB } from '@/components/nav/fab'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { CategoryIcon } from '@/components/ui/category-icon'
import { Select } from '@/components/ui/select'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { formatCurrency } from '@/lib/currency/format'
import { monthPeriod, previousMonthPeriod, previousYearPeriod, yearPeriod } from '@/lib/calculations'
import { cn } from '@/lib/utils'
import { useSettings } from '@/providers/settings-provider'
import { useCategories } from '@/hooks/use-categories'
import { usePeople } from '@/hooks/use-people'
import { useSummary, type CategoryBreakdownItem, type MonthlyBar, type SummaryData, type SummaryRange } from '@/hooks/use-summary'

type Scope = 'month' | 'year' | 'all'

const SCOPE_OPTIONS = [
  { value: 'month' as const, label: 'Month' },
  { value: 'year' as const, label: 'Year' },
  { value: 'all' as const, label: 'All time' },
]

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
  const { people } = usePeople()

  const { range, periodLabel } = useMemo<{ range: SummaryRange; periodLabel: string }>(() => {
    if (scope === 'all') {
      return {
        range: { start: -Infinity, end: Infinity, hasOpening: false, previous: null },
        periodLabel: 'All time',
      }
    }
    if (scope === 'year') {
      return {
        range: { ...yearPeriod(year), hasOpening: true, previous: previousYearPeriod(year) },
        periodLabel: String(year),
      }
    }
    const [y, m] = monthKey.split('-').map(Number)
    return {
      range: { ...monthPeriod(y, m), hasOpening: true, previous: previousMonthPeriod(y, m) },
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
  const personName = useMemo(() => {
    const map = new Map(people.map((p) => [p.$id, p]))
    return (id: string) => map.get(id)?.name ?? 'Unknown'
  }, [people])

  const fmt = (v: number) => formatCurrency(v, defaultCurrency)
  const hasData = data.transactionCount > 0
  const peopleNet = data.peopleNet

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Summary</h1>
        <p className="text-sm text-text-secondary">{periodLabel}</p>
      </div>

      <div className="space-y-3">
        <SegmentedControl value={scope} onChange={(s) => setScope(s)} options={SCOPE_OPTIONS} />
        {scope === 'month' && (
          <Select name="month" value={monthKey} onChange={(e) => setMonthKey(e.target.value)}>
            {monthOptions.map((m) => (<option key={m.key} value={m.key}>{m.label}</option>))}
          </Select>
        )}
        {scope === 'year' && (
          <Select name="year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {yearOptions.map((y) => (<option key={y} value={y}>{y}</option>))}
          </Select>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-[var(--radius-lg)]" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Skeleton className="h-16 rounded-[var(--radius-md)]" />
            <Skeleton className="h-16 rounded-[var(--radius-md)]" />
            <Skeleton className="h-16 rounded-[var(--radius-md)]" />
            <Skeleton className="h-16 rounded-[var(--radius-md)]" />
          </div>
        </div>
      ) : (
        <>
          <IncomeExpenseSavings data={data} fmt={fmt} />

          {range.hasOpening && (
            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-[var(--radius-md)] border border-border bg-surface px-3.5 py-3 shadow-[var(--shadow-sm)]">
                <p className="text-xs text-text-secondary">Opening balance</p>
                <p className="mt-1 text-base font-semibold tabular-nums text-text-primary">{fmt(data.openingBalance)}</p>
                <p className="mt-0.5 text-xs text-text-tertiary">Start of {periodLabel}</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-border bg-surface px-3.5 py-3 shadow-[var(--shadow-sm)]">
                <p className="text-xs text-text-secondary">Closing balance</p>
                <p className={cn('mt-1 text-base font-semibold tabular-nums', data.closingBalance >= data.openingBalance ? 'text-text-primary' : 'text-expense')}>
                  {fmt(data.closingBalance)}
                </p>
                <p className="mt-0.5 text-xs text-text-tertiary">End of {periodLabel}</p>
              </div>
            </section>
          )}

          {!hasData ? (
            <EmptyState
              icon={<TrendingUp className="size-6" />}
              title="No activity in this period"
              description="No income, expenses, exchanges, or give/take transactions were recorded here."
            />
          ) : (
            <>
              <NetSavingsHero data={data} fmt={fmt} />

              <TrendRow
                incomeTrend={data.incomeTrend}
                expenseTrend={data.expenseTrend}
                savingsTrend={data.savingsTrend}
              />

              <section className="grid grid-cols-2 gap-3">
                <StatTile icon={<Receipt className="size-4" />} label="Transactions" value={String(data.transactionCount)} />
                <StatTile icon={<Zap className="size-4" />} label="Avg. txn" value={fmt(data.avgTransaction)} />
                <StatTile icon={<Users className="size-4" />} label="People net" value={peopleNet >= 0 ? `+${fmt(peopleNet)}` : fmt(peopleNet)} tone={peopleNet > 0 ? 'expense' : peopleNet < 0 ? 'income' : undefined} />
                <StatTile icon={<Calendar className="size-4" />} label="≈ per day" value={fmt(data.dailyAverage)} tone="expense" />
              </section>

              <CashFlowChart months={data.months} fmt={fmt} />

              {data.personBreakdown.length > 0 && (
                <section className="space-y-2">
                  <h2 className="text-sm font-semibold text-text-primary">People activity</h2>
                  <div className="space-y-2 rounded-[var(--radius-md)] border border-border bg-surface p-3 shadow-[var(--shadow-sm)]">
                    {data.personBreakdown.slice(0, 5).map((item) => (
                      <div key={item.personId} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-text-primary">{personName(item.personId)}</span>
                        <span className="flex items-center gap-3 tabular-nums">
                          <span className="text-xs text-expense">-{fmt(item.given)}</span>
                          <span className="text-xs text-income">+{fmt(item.taken)}</span>
                          <span className={cn('font-semibold', item.amount > 0 ? 'text-expense' : item.amount < 0 ? 'text-income' : 'text-text-tertiary')}>
                            {item.amount === 0 ? '—' : fmt(item.amount)}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <Breakdown
                title="Top spending"
                items={data.expenseByCategory.slice(0, 6)}
                tone="expense"
                fmt={fmt}
                name={categoryName}
                icon={categoryIcon}
              />

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

function TrendRow({
  incomeTrend, expenseTrend, savingsTrend,
}: {
  incomeTrend: number | null
  expenseTrend: number | null
  savingsTrend: number | null
}) {
  if (incomeTrend == null && expenseTrend == null && savingsTrend == null) return null

  /**
   * The arrow always shows which way the number moved. The colour shows whether
   * that movement is good news, which is the opposite for spending: earning more
   * is green, spending more is red.
   */
  const badge = (label: string, trend: number | null, risingIsGood: boolean) => {
    if (trend == null) return null
    const rising = trend > 0
    const good = rising === risingIsGood
    return (
      <div className={cn('flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', good ? 'bg-income-soft text-income' : 'bg-expense-soft text-expense')}>
        {rising ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
        {label}: {trend === Infinity ? 'New' : `${Math.abs(trend).toFixed(0)}%`}
      </div>
    )
  }
  return (
    <section className="flex flex-wrap gap-2">
      {badge('Income', incomeTrend, true)}
      {badge('Expense', expenseTrend, false)}
      {badge('Savings', savingsTrend, true)}
    </section>
  )
}

function NetSavingsHero({ data, fmt }: { data: SummaryData; fmt: (v: number) => string }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">Net savings</p>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', data.savings >= 0 ? 'bg-income-soft text-income' : 'bg-expense-soft text-expense')}>
          {data.savingsRate == null ? 'No income' : `${(data.savingsRate * 100).toFixed(0)}% saved`}
        </span>
      </div>
      <p className={cn('mt-1 text-[1.75rem] font-bold tabular-nums tracking-tight', data.savings >= 0 ? 'text-text-primary' : 'text-expense')}>
        {fmt(data.savings)}
      </p>
      <div className="mt-3 flex gap-4 text-sm">
        <span className="inline-flex items-center gap-1 text-income"><ArrowUpRight className="size-4" /> {fmt(data.income)}</span>
        <span className="inline-flex items-center gap-1 text-expense"><ArrowDownRight className="size-4" /> {fmt(data.expense)}</span>
      </div>
    </section>
  )
}

function IncomeExpenseSavings({ data, fmt }: { data: SummaryData; fmt: (v: number) => string }) {
  const cell = (label: string, value: number, tone: 'income' | 'expense' | 'exchange' | 'neutral', signed = false) => (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface px-3 py-3 shadow-[var(--shadow-sm)]">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className={cn('mt-1 text-base font-semibold tabular-nums', tone === 'income' && 'text-income', tone === 'expense' && 'text-expense', tone === 'exchange' && 'text-exchange', tone === 'neutral' && data.savings < 0 && 'text-expense', tone === 'neutral' && data.savings >= 0 && 'text-text-primary')}>
        {signed ? (value >= 0 ? `+${fmt(value)}` : `-${fmt(Math.abs(value))}`) : fmt(value)}
      </p>
    </div>
  )
  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cell('Income', data.income, 'income')}
      {cell('Expense', data.expense, 'expense')}
      {cell('Transfer fees', data.exchange, 'exchange', true)}
      {cell('Savings', data.savings, 'neutral')}
    </section>
  )
}

const CHART_HEIGHT = 120

/**
 * Income and expense per month, side by side.
 *
 * Bar heights are computed in pixels rather than as percentages: the bars used
 * to be sized as a % of a parent whose own height was left undefined (the row
 * is `items-end`, so columns size to their content), which browsers resolve to
 * zero. They were also stacked, so a month at the top of the scale needed 200%
 * of the available height.
 *
 * Income is always the left bar and expense always the right. That fixed order
 * is deliberate: the app's income/expense green and red sit at a deutan ΔE of
 * 5.0, so colour alone does not separate them for red-green colourblind
 * readers. Position, the legend and per-bar labels carry the identity.
 */
function CashFlowChart({ months, fmt }: { months: MonthlyBar[]; fmt: (v: number) => string }) {
  const maxBar = Math.max(...months.map((m) => Math.max(m.income, m.expense)), 1)
  const barHeight = (value: number) => (value <= 0 ? 0 : Math.max(2, Math.round((value / maxBar) * CHART_HEIGHT)))

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
        <BarChart3 className="size-4" /> Cash flow — last 12 months
      </h2>
      <div className="rounded-[var(--radius-md)] border border-border bg-surface p-3 shadow-[var(--shadow-sm)]">
        <div className="overflow-x-auto">
          <div className="min-w-[280px]">
            <div className="flex items-end gap-1 border-b border-border" style={{ height: CHART_HEIGHT }}>
              {months.map((m) => (
                <div
                  key={m.month}
                  className="flex flex-1 items-end justify-center gap-[2px]"
                  style={{ height: CHART_HEIGHT }}
                >
                  <span
                    className="w-1/2 max-w-[10px] rounded-t-[3px] bg-income"
                    style={{ height: barHeight(m.income) }}
                    title={`${m.label} · Income ${fmt(m.income)}`}
                    aria-label={`${m.label} income ${fmt(m.income)}`}
                  />
                  <span
                    className="w-1/2 max-w-[10px] rounded-t-[3px] bg-expense"
                    style={{ height: barHeight(m.expense) }}
                    title={`${m.label} · Expense ${fmt(m.expense)}`}
                    aria-label={`${m.label} expense ${fmt(m.expense)}`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-1">
              {months.map((m) => (
                <span key={m.month} className="flex-1 text-center text-xs font-medium text-text-secondary" title={m.label}>
                  {m.label.slice(0, 3)}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-4 text-xs text-text-secondary">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-income" /> Income <span className="text-text-tertiary">(left)</span></span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-expense" /> Expense <span className="text-text-tertiary">(right)</span></span>
        </div>
      </div>
    </section>
  )
}

function StatTile({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: 'income' | 'expense' }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface px-3.5 py-3 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-1.5 text-text-secondary">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={cn('mt-1 text-base font-semibold tabular-nums', tone === 'income' && 'text-income', tone === 'expense' && 'text-expense', !tone && 'text-text-primary')}>{value}</p>
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
              <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', tone === 'income' ? 'bg-income-soft text-income' : tone === 'expense' ? 'bg-expense-soft text-expense' : 'bg-exchange-soft text-exchange')}>
                <CategoryIcon name={icon(item.categoryId)} className="size-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{name(item.categoryId)}</span>
              <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-text-primary">
                {fmt(item.amount)}
                <span className="ml-1 text-xs font-normal text-text-tertiary">{(item.share * 100).toFixed(0)}%</span>
              </span>
            </div>
            <div className="ml-[2.625rem] h-1.5 overflow-hidden rounded-full bg-surface-hover">
              <div className={cn('h-full rounded-full', tone === 'income' ? 'bg-income' : tone === 'expense' ? 'bg-expense' : 'bg-exchange')} style={{ width: `${Math.max(item.share * 100, 2)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
