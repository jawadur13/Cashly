'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { BarChart3, ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react'
import { Amount } from '@/components/ui/amount'
import { Button } from '@/components/ui/button'
import { CategoryIcon } from '@/components/ui/category-icon'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import { SectionHeader } from '@/components/ui/list'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuickAdd } from '@/components/transactions/quick-add'
import { formatCompact, formatMoney } from '@/lib/currency/format'
import { monthPeriod, previousMonthPeriod, previousYearPeriod, yearPeriod } from '@/lib/calculations'
import { chartScale } from '@/lib/chart'
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

const MONTHS_BACK = 36
const YEARS_BACK = 6

function monthKeyFor(offset: number) {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() - offset, 1)
  return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, date: d }
}

/** Trend chip. Whether rising is good depends on the metric (AGENTS.md). */
function Trend({ value, goodWhenUp, label }: { value: number | null; goodWhenUp: boolean; label: string }) {
  if (value === null || !Number.isFinite(value)) return null
  const up = value > 0
  const good = value === 0 ? null : up === goodWhenUp
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        good === null ? 'bg-white/10 text-hero-muted' : good ? 'bg-[var(--green-400)]/15 text-[var(--green-400)]' : 'bg-[var(--red-400)]/15 text-[var(--red-400)]'
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label} {up ? '+' : ''}
      {Math.round(value)}%
    </span>
  )
}

function Hero({ data, currency, periodLabel, compareLabel }: { data: SummaryData; currency: string; periodLabel: string; compareLabel: string | null }) {
  const rate = data.savingsRate
  const ring = Math.max(0, Math.min(1, rate ?? 0))
  const c = 2 * Math.PI * 22
  return (
    <section aria-label="Overview" className="hero-panel gold-hairline overflow-hidden rounded-[var(--radius-xl)] p-5 shadow-[var(--shadow-lg)] md:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-hero-muted">Net saved · {periodLabel}</p>
          <Amount
            value={data.savings}
            currency={currency}
            className="mt-1 text-[2.125rem] font-semibold leading-tight tracking-tight md:text-[2.5rem]"
            currencyClassName="text-[0.5em] font-medium opacity-70"
          />
        </div>
        {rate !== null && (
          <div className="relative shrink-0" aria-label={`${Math.round(rate * 100)} percent of income saved`}>
            <svg viewBox="0 0 52 52" className="size-16 -rotate-90" aria-hidden>
              <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="5" />
              <circle cx="26" cy="26" r="22" fill="none" stroke="var(--gold-300)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${ring * c} ${c}`} />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center text-sm font-semibold leading-none">
              {Math.round(Math.max(-99, Math.min(100, rate * 100)))}%
              <span className="mt-0.5 text-[0.625rem] font-medium text-hero-muted">saved</span>
            </span>
          </div>
        )}
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
        <div>
          <dt className="text-xs font-medium text-hero-muted">Income</dt>
          <dd><Amount value={data.income} currency={currency} className="text-base font-semibold" /></dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-hero-muted">Spending</dt>
          <dd><Amount value={data.expense} currency={currency} className="text-base font-semibold" /></dd>
        </div>
      </dl>
      {compareLabel && (data.incomeTrend !== null || data.expenseTrend !== null) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-hero-muted">vs {compareLabel}</span>
          <Trend value={data.incomeTrend} goodWhenUp label="Income" />
          <Trend value={data.expenseTrend} goodWhenUp={false} label="Spending" />
        </div>
      )}
    </section>
  )
}

function CashFlowChart({ months, currency }: { months: MonthlyBar[]; currency: string }) {
  const [selected, setSelected] = useState<number | null>(null)
  const height = 160
  const scale = chartScale(months.flatMap((m) => [m.income, m.expense]))
  const ticks = [scale, scale / 2]
  const focus = selected !== null ? months[selected] : null
  const px = (v: number) => (v <= 0 ? 0 : Math.max(3, Math.round((v / scale) * height)))

  return (
    <section aria-label="Cash flow">
      <SectionHeader title="Cash flow · 12 months" />
      <div className="rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-sm)] ring-1 ring-border md:p-5">
        <div className="mb-4 flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1">
          {focus ? (
            <p className="text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">{focus.label}</span> · In{' '}
              <Amount value={focus.income} currency={currency} tone="income" className="font-semibold" /> · Out{' '}
              <Amount value={focus.expense} currency={currency} className="font-semibold" />
            </p>
          ) : (
            <p className="text-sm text-text-tertiary">Tap a month for its numbers</p>
          )}
          <div className="flex items-center gap-3 text-xs text-text-secondary" aria-hidden>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-income" /> Income</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[var(--navy-700)] [[data-theme=dark]_&]:bg-accent" /> Spending</span>
          </div>
        </div>
        <div className="relative" aria-hidden>
          <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height }}>
            {ticks.map((t, i) => (
              <div key={i} className="absolute inset-x-0 flex items-center gap-2" style={{ top: `${i * 50}%` }}>
                <span className="w-9 shrink-0 text-right text-[0.6875rem] tabular-nums text-text-tertiary">{formatCompact(t)}</span>
                <span className="h-px flex-1 border-t border-dashed border-border" />
              </div>
            ))}
            <div className="absolute inset-x-0 bottom-0 ml-11 h-px bg-border-strong" />
          </div>
          <div className="ml-11 flex items-end gap-1" style={{ height }}>
            {months.map((m, i) => (
              <button
                key={m.month}
                type="button"
                tabIndex={-1}
                onClick={() => setSelected(selected === i ? null : i)}
                className={cn(
                  'flex h-full flex-1 cursor-pointer items-end justify-center gap-[2px] rounded-t-[6px] transition-colors',
                  selected === i ? 'bg-surface-hover' : 'hover:bg-surface-hover/60'
                )}
              >
                <span className="w-full max-w-3 rounded-t-[3px] bg-income transition-[height] duration-500" style={{ height: px(m.income) }} />
                <span className="w-full max-w-3 rounded-t-[3px] bg-[var(--navy-700)] transition-[height] duration-500 [[data-theme=dark]_&]:bg-accent" style={{ height: px(m.expense) }} />
              </button>
            ))}
          </div>
          <div className="ml-11 mt-2 flex gap-1">
            {months.map((m, i) => (
              <span key={m.month} className={cn('flex-1 text-center text-[0.6875rem]', selected === i ? 'font-semibold text-text-primary' : 'text-text-tertiary')}>
                {m.label.slice(0, 1)}
                <span className="hidden sm:inline">{m.label.slice(1, 3)}</span>
              </span>
            ))}
          </div>
        </div>
        <table className="sr-only">
          <caption>Income and spending by month</caption>
          <thead>
            <tr><th>Month</th><th>Income</th><th>Spending</th></tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.month}>
                <td>{m.label}</td>
                <td>{formatMoney(m.income, currency)}</td>
                <td>{formatMoney(m.expense, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Breakdown({
  title,
  items,
  tone,
  currency,
  categoryName,
  categoryIcon,
  hrefFor,
}: {
  title: string
  items: CategoryBreakdownItem[]
  tone: 'income' | 'expense'
  currency: string
  categoryName: (id: string) => string
  categoryIcon: (id: string) => string | undefined
  hrefFor: (categoryId: string) => string
}) {
  if (items.length === 0) return null
  const max = items[0]?.amount || 1
  return (
    <section aria-label={title}>
      <SectionHeader title={title} />
      <div className="space-y-1 rounded-[var(--radius-lg)] bg-surface p-2 shadow-[var(--shadow-sm)] ring-1 ring-border">
        {items.map((item) => (
          <Link key={item.categoryId} href={hrefFor(item.categoryId)} className="block rounded-[var(--radius-md)] px-2.5 py-2.5 transition-colors hover:bg-surface-hover">
            <div className="flex items-center gap-3">
              <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]', tone === 'income' ? 'bg-income-soft text-income' : 'bg-expense-soft text-expense')}>
                <CategoryIcon name={categoryIcon(item.categoryId)} className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-text-primary">{categoryName(item.categoryId)}</span>
                <span className="block text-xs text-text-tertiary">{item.count} transaction{item.count === 1 ? '' : 's'}</span>
              </span>
              <span className="text-right">
                <Amount value={item.amount} currency={currency} className="block text-sm font-semibold" />
                <span className="block text-xs tabular-nums text-text-tertiary">{Math.round(item.share * 100)}%</span>
              </span>
            </div>
            <div className="ml-11 mt-2 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
              <div
                className={cn('h-full rounded-full', tone === 'income' ? 'bg-income' : 'bg-[var(--navy-700)] [[data-theme=dark]_&]:bg-accent')}
                style={{ width: `${(item.amount / max) * 100}%` }}
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default function InsightsPage() {
  const [scope, setScope] = useState<Scope>('month')
  const [monthOffset, setMonthOffset] = useState(0)
  const [yearOffset, setYearOffset] = useState(0)
  const { defaultCurrency } = useSettings()
  const { categories } = useCategories()
  const { people } = usePeople()
  const { open } = useQuickAdd()

  const { range, periodLabel, compareLabel, monthKey } = useMemo(() => {
    if (scope === 'all') {
      return {
        range: { start: -Infinity, end: Infinity, hasOpening: false, previous: null } as SummaryRange,
        periodLabel: 'All time',
        compareLabel: null,
        monthKey: undefined,
      }
    }
    if (scope === 'year') {
      const year = new Date().getFullYear() - yearOffset
      return {
        range: { ...yearPeriod(year), hasOpening: true, previous: previousYearPeriod(year) } as SummaryRange,
        periodLabel: String(year),
        compareLabel: String(year - 1),
        monthKey: undefined,
      }
    }
    const { key, date } = monthKeyFor(monthOffset)
    const prev = new Date(date.getFullYear(), date.getMonth() - 1, 1)
    return {
      range: {
        ...monthPeriod(date.getFullYear(), date.getMonth() + 1),
        hasOpening: true,
        previous: previousMonthPeriod(date.getFullYear(), date.getMonth() + 1),
      } as SummaryRange,
      periodLabel: date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      compareLabel: prev.toLocaleDateString(undefined, { month: 'long' }),
      monthKey: key,
    }
  }, [scope, monthOffset, yearOffset])

  const { data, loading, error, refresh } = useSummary(range)

  const catMap = useMemo(() => new Map(categories.map((c) => [c.$id, c])), [categories])
  const categoryName = (id: string) => catMap.get(id)?.name ?? 'Uncategorized'
  const categoryIcon = (id: string) => catMap.get(id)?.icon
  const personName = (id: string) => people.find((p) => p.$id === id)?.name ?? 'Someone'
  const hrefFor = (type: 'income' | 'expense') => (categoryId: string) =>
    `/app/transactions?type=${type}&category=${categoryId}${monthKey ? `&month=${monthKey}` : ''}`

  const canBack = scope === 'month' ? monthOffset < MONTHS_BACK : yearOffset < YEARS_BACK
  const canForward = scope === 'month' ? monthOffset > 0 : yearOffset > 0
  const step = (dir: 1 | -1) => (scope === 'month' ? setMonthOffset((o) => o + dir) : setYearOffset((o) => o + dir))
  const hasData = data.transactionCount > 0

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Insights" subtitle="Where your money came from and where it went" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl label="Period" value={scope} onChange={setScope} options={SCOPE_OPTIONS} className="sm:w-80" />
        {scope !== 'all' && (
          <div className="flex items-center justify-between gap-1 rounded-[var(--radius-full)] bg-surface p-1 shadow-[var(--shadow-sm)] ring-1 ring-border sm:min-w-64">
            <button type="button" onClick={() => step(1)} disabled={!canBack} aria-label="Previous period" className="pressable flex size-11 items-center justify-center rounded-full text-text-secondary hover:bg-surface-hover disabled:opacity-30">
              <ChevronLeft className="size-5" />
            </button>
            <span className="text-sm font-semibold text-text-primary" aria-live="polite">{periodLabel}</span>
            <button type="button" onClick={() => step(-1)} disabled={!canForward} aria-label="Next period" className="pressable flex size-11 items-center justify-center rounded-full text-text-secondary hover:bg-surface-hover disabled:opacity-30">
              <ChevronRight className="size-5" />
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-56 rounded-[var(--radius-xl)]" />
          <Skeleton className="h-64 rounded-[var(--radius-lg)]" />
        </div>
      ) : error ? (
        <ErrorState what="your insights" error={error} onRetry={refresh} />
      ) : !hasData ? (
        <EmptyState
          icon={<BarChart3 />}
          title={`Nothing recorded in ${periodLabel}`}
          description="Insights fill in as you record income and spending."
          action={<Button onClick={() => open()}>Add a transaction</Button>}
        />
      ) : (
        <div className="space-y-6 lg:grid lg:grid-cols-5 lg:gap-6 lg:space-y-0">
          <div className="space-y-6 lg:col-span-3">
            <Hero data={data} currency={defaultCurrency} periodLabel={periodLabel} compareLabel={compareLabel} />
            <CashFlowChart months={data.months} currency={defaultCurrency} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: 'Average spend / day', value: data.dailyAverage, show: data.dailyAverage > 0 },
                { label: 'Largest expense', value: data.largestExpense, show: data.largestExpense > 0 },
                // Transfers net to received − sent: negative is fees paid, positive a gain.
                { label: data.exchange < 0 ? 'Transfer fees' : 'Transfer gains', value: Math.abs(data.exchange), show: data.exchange !== 0 },
              ]
                .filter((s) => s.show)
                .map((s) => (
                  <div key={s.label} className="rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-sm)] ring-1 ring-border">
                    <p className="text-xs font-medium text-text-tertiary">{s.label}</p>
                    <Amount value={s.value} currency={defaultCurrency} className="mt-1 text-base font-semibold" />
                  </div>
                ))}
              <div className="rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-sm)] ring-1 ring-border">
                <p className="text-xs font-medium text-text-tertiary">Transactions</p>
                <p className="mt-1 text-base font-semibold tabular-nums">{data.transactionCount}</p>
              </div>
            </div>
            {range.hasOpening && (
              <p className="rounded-[var(--radius-lg)] bg-surface-sunken px-4 py-3 text-sm text-text-secondary">
                Balance moved from <Amount value={data.openingBalance} currency={defaultCurrency} className="font-semibold text-text-primary" /> to{' '}
                <Amount value={data.closingBalance} currency={defaultCurrency} className="font-semibold text-text-primary" /> over {periodLabel}.
              </p>
            )}
          </div>
          <div className="space-y-6 lg:col-span-2">
            <Breakdown title="Spending by category" items={data.expenseByCategory} tone="expense" currency={defaultCurrency} categoryName={categoryName} categoryIcon={categoryIcon} hrefFor={hrefFor('expense')} />
            <Breakdown title="Income sources" items={data.incomeByCategory} tone="income" currency={defaultCurrency} categoryName={categoryName} categoryIcon={categoryIcon} hrefFor={hrefFor('income')} />
            {data.personBreakdown.length > 0 && (
              <section aria-label="People this period">
                <SectionHeader title="People this period" />
                <div className="rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-sm)] ring-1 ring-border">
                  {data.personBreakdown.map((p, i) => (
                    <Link key={p.personId} href={`/app/people/${p.personId}`} className={cn('flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-hover', i > 0 && 'border-t border-border')}>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{personName(p.personId)}</span>
                      <span className="text-right text-xs text-text-tertiary">
                        {p.given > 0 && <>Gave <Amount value={p.given} currency={defaultCurrency} className="font-semibold text-text-secondary" /></>}
                        {p.given > 0 && p.taken > 0 && ' · '}
                        {p.taken > 0 && <>Got <Amount value={p.taken} currency={defaultCurrency} className="font-semibold text-text-secondary" /></>}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
