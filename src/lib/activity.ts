/**
 * Pure helpers behind the Activity screen and the transaction form: filtering,
 * grouping by day, in/out totals and "most used" ordering. They read amounts
 * through the money helpers and never change a calculation rule.
 */
import { readAmountMinor } from './money'
import { dayKey } from './currency/format'
import type { Transaction, TransactionType } from './types'

export type ConvertFn = (minor: number, currency: string) => number

export interface ActivityFilter {
  type?: TransactionType
  accountId?: string
  categoryId?: string
  personId?: string
  /** 'YYYY-MM' in local time; omitted = all time. */
  month?: string
  query?: string
}

export interface ActivityLabels {
  categoryName: (id: string) => string | undefined
  personName: (id: string) => string | undefined
  accountName: (id: string) => string | undefined
}

export function monthKeyOf(date: string | Date): string {
  return dayKey(date).slice(0, 7)
}

export function matchesFilter(t: Transaction, f: ActivityFilter, labels?: ActivityLabels): boolean {
  if (f.type && t.type !== f.type) return false
  if (f.accountId && t.accountId !== f.accountId && t.fromAccountId !== f.accountId && t.toAccountId !== f.accountId) {
    return false
  }
  if (f.categoryId && t.categoryId !== f.categoryId) return false
  if (f.personId && t.personId !== f.personId) return false
  if (f.month && monthKeyOf(t.date) !== f.month) return false
  const q = f.query?.trim().toLowerCase()
  if (q) {
    const haystack = [
      t.note,
      t.payee,
      labels?.categoryName(t.categoryId),
      t.personId ? labels?.personName(t.personId) : undefined,
      labels?.accountName(t.accountId),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    if (!haystack.includes(q)) return false
  }
  return true
}

/** Newest first; `id` breaks ties so the order is stable. */
export function sortNewestFirst(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    const byDate = new Date(b.date).getTime() - new Date(a.date).getTime()
    return byDate !== 0 ? byDate : b.$id.localeCompare(a.$id)
  })
}

export interface DayGroup {
  key: string
  date: string
  items: Transaction[]
}

/** Groups an already-sorted list by local calendar day, keeping order. */
export function groupByDay(sorted: Transaction[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const t of sorted) {
    const key = dayKey(t.date)
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.items.push(t)
    else groups.push({ key, date: t.date, items: [t] })
  }
  return groups
}

/**
 * Income and expense in the display currency, each converted from its own
 * currency before adding. Transfers and give/take are movements, not income
 * or spending, so they are not counted — the same rule as Insights.
 */
export function incomeExpenseTotals(transactions: Transaction[], convert: ConvertFn) {
  let income = 0
  let expense = 0
  for (const t of transactions) {
    if (t.type === 'income') income += convert(readAmountMinor(t), t.currency)
    else if (t.type === 'expense') expense += convert(readAmountMinor(t), t.currency)
  }
  return { income, expense, net: income - expense }
}

/** How often each category is used, for putting favourites first. */
export function categoryUsage(transactions: Transaction[], type: TransactionType): Map<string, number> {
  const counts = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== type || !t.categoryId) continue
    counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1)
  }
  return counts
}

/** Most recent use of each person, for putting recent people first. */
export function personRecency(transactions: Transaction[]): Map<string, number> {
  const latest = new Map<string, number>()
  for (const t of transactions) {
    if (!t.personId) continue
    const time = new Date(t.date).getTime()
    if (time > (latest.get(t.personId) ?? 0)) latest.set(t.personId, time)
  }
  return latest
}

/** Distinct payees, most recent first, for suggestions. */
export function recentPayees(transactions: Transaction[], limit = 12): string[] {
  const out: string[] = []
  const lower = new Set<string>()
  for (const t of sortNewestFirst(transactions)) {
    const p = t.payee?.trim()
    if (p && !lower.has(p.toLowerCase())) {
      lower.add(p.toLowerCase())
      out.push(p)
      if (out.length === limit) break
    }
  }
  return out
}

export interface CategoryTotal {
  categoryId: string
  amount: number
  share: number
}

/**
 * Spending (or income) per category in the display currency, largest first,
 * with each category's share of the total. Converted per row before adding.
 */
export function totalsByCategory(
  transactions: Transaction[],
  type: 'income' | 'expense',
  convert: ConvertFn
): CategoryTotal[] {
  const sums = new Map<string, number>()
  let total = 0
  for (const t of transactions) {
    if (t.type !== type) continue
    const value = convert(readAmountMinor(t), t.currency)
    sums.set(t.categoryId, (sums.get(t.categoryId) ?? 0) + value)
    total += value
  }
  return [...sums.entries()]
    .map(([categoryId, amount]) => ({ categoryId, amount, share: total > 0 ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount)
}
