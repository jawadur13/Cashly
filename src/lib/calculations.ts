import { readAmountMinor, readFromAmountMinor, readToAmountMinor } from './money'
import type { Transaction } from './types'

/**
 * Cash-direction convention shared by account balances, people balances, and
 * the Summary hook: income/take add cash, expense/give remove it. Transfers
 * (stored as `exchange`) are two-sided and handled separately by callers via
 * fromAmount/toAmount.
 */
export function signedCashDelta(t: { type: Transaction['type']; amount: number }): number {
  if (t.type === 'income' || t.type === 'take') return t.amount
  if (t.type === 'expense' || t.type === 'give') return -t.amount
  return 0
}

/**
 * Converts an amount from its own currency into the display currency. Both the
 * input and the result are whole minor units, so implementations must round —
 * see `toDisplayCurrency`.
 */
export type ConvertFn = (minorAmount: number, currency: string) => number

/** Half-open time window: `start` is included, `end` is not. */
export interface Period {
  start: number
  end: number
}

/**
 * A calendar month, as real month boundaries rather than a fixed number of
 * milliseconds. `month` is 1-12, but values outside that range roll over
 * naturally (month 0 is December of the previous year), which is what makes
 * `previousMonthPeriod` a one-liner.
 */
export function monthPeriod(year: number, month: number): Period {
  return {
    start: new Date(year, month - 1, 1).getTime(),
    end: new Date(year, month, 1).getTime(),
  }
}

export function yearPeriod(year: number): Period {
  return {
    start: new Date(year, 0, 1).getTime(),
    end: new Date(year + 1, 0, 1).getTime(),
  }
}

/**
 * The whole calendar month before the given one. Months differ in length, so
 * this must be derived from the calendar rather than by subtracting a duration
 * — subtracting "30 days" from October lands in the middle of September.
 */
export function previousMonthPeriod(year: number, month: number): Period {
  return monthPeriod(year, month - 1)
}

/** The whole calendar year before the given one — leap years included. */
export function previousYearPeriod(year: number): Period {
  return yearPeriod(year - 1)
}

/**
 * Percentage change from `previous` to `current`.
 *
 * Divides by the *magnitude* of the baseline so the sign always reflects the
 * real direction of travel. Dividing by a negative baseline would invert it,
 * making a shrinking loss look like a decline.
 *
 * Returns null when there is no change to report, and Infinity when something
 * grew from nothing (no meaningful percentage exists).
 */
export function percentChange(current: number, previous: number): number | null {
  // Signed infinity, not bare Infinity: going from break-even to a 50,000 loss
  // is a fall, and a caller colouring by `trend > 0` would otherwise paint it
  // as a rise.
  if (previous === 0) {
    if (current === 0) return null
    return current > 0 ? Infinity : -Infinity
  }
  return ((current - previous) / Math.abs(previous)) * 100
}

/**
 * Share of income that was kept. Null when there was no income — a rate of
 * "0%" would imply nothing was saved out of something, which is not the case.
 */
export function savingsRate(savings: number, income: number): number | null {
  if (income <= 0) return null
  return savings / income
}

export interface CategoryRow {
  categoryId: string
  amount: number
}

export interface PersonRow {
  personId: string
  type: 'give' | 'take'
  amount: number
}

export interface CategoryBreakdownItem {
  categoryId: string
  amount: number
  count: number
  share: number
}

export interface PersonBreakdownItem {
  personId: string
  amount: number
  count: number
  given: number
  taken: number
}

export interface PeriodTotals {
  income: number
  expense: number
  /** Net cash change caused by transfers — i.e. the fee lost in transit. */
  exchangeNet: number
  peopleNet: number
  savings: number
  incomeCount: number
  expenseCount: number
  exchangeCount: number
  giveCount: number
  takeCount: number
  transactionCount: number
  largestExpense: number
  openingBalance: number
  incomeRows: CategoryRow[]
  expenseRows: CategoryRow[]
  personRows: PersonRow[]
}

export interface AggregateOptions {
  /** Inclusive lower bound (ms). */
  start: number
  /** Exclusive upper bound (ms). */
  end: number
  /** When true, everything before `start` is accumulated into openingBalance. */
  hasOpening: boolean
  convert: ConvertFn
}

/**
 * Walks every transaction once and produces the totals for a single period.
 * Pure: no dates, no network, no React. `now` never enters here — callers pass
 * explicit bounds so the same input always yields the same output.
 */
export function aggregatePeriod(
  transactions: Transaction[],
  { start, end, hasOpening, convert }: AggregateOptions
): PeriodTotals {
  let income = 0
  let expense = 0
  let exchangeNet = 0
  let peopleNet = 0
  let incomeCount = 0
  let expenseCount = 0
  let exchangeCount = 0
  let giveCount = 0
  let takeCount = 0
  let largestExpense = 0
  let openingBalance = 0
  const incomeRows: CategoryRow[] = []
  const expenseRows: CategoryRow[] = []
  const personRows: PersonRow[] = []

  for (const t of transactions) {
    const ts = new Date(t.date).getTime()

    if (ts < start) {
      if (hasOpening) {
        if (t.type === 'exchange') {
          openingBalance += convert(readToAmountMinor(t) - readFromAmountMinor(t), t.currency)
        } else {
          openingBalance += signedCashDelta({
            type: t.type,
            amount: convert(readAmountMinor(t), t.currency),
          })
        }
      }
      continue
    }
    if (ts >= end) continue

    // Converted only once the row is known to be in range — the 12-month chart
    // runs this fourteen times over the full history.
    const value = convert(readAmountMinor(t), t.currency)

    if (t.type === 'income') {
      income += value
      incomeCount += 1
      incomeRows.push({ categoryId: t.categoryId, amount: value })
    } else if (t.type === 'expense') {
      expense += value
      expenseCount += 1
      largestExpense = Math.max(largestExpense, value)
      expenseRows.push({ categoryId: t.categoryId, amount: value })
    } else if (t.type === 'give') {
      giveCount += 1
      peopleNet -= value
      personRows.push({ personId: t.personId ?? '', type: 'give', amount: value })
    } else if (t.type === 'take') {
      takeCount += 1
      peopleNet += value
      personRows.push({ personId: t.personId ?? '', type: 'take', amount: value })
    } else if (t.type === 'exchange') {
      exchangeCount += 1
      exchangeNet += convert(readToAmountMinor(t) - readFromAmountMinor(t), t.currency)
    }
  }

  return {
    income,
    expense,
    exchangeNet,
    peopleNet,
    savings: income - expense,
    incomeCount,
    expenseCount,
    exchangeCount,
    giveCount,
    takeCount,
    transactionCount: incomeCount + expenseCount + exchangeCount + giveCount + takeCount,
    largestExpense,
    openingBalance,
    incomeRows,
    expenseRows,
    personRows,
  }
}

/**
 * Balance per account id, in each account's own currency.
 *
 * Amounts are summed raw: a transaction is always denominated in its account's
 * currency (the form offers no other option), so there is nothing to convert
 * here. Transfers move money between two accounts and are applied to both.
 */
export function accountBalances(transactions: Transaction[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const t of transactions) {
    if (t.type === 'exchange') {
      if (t.fromAccountId) map[t.fromAccountId] = (map[t.fromAccountId] ?? 0) - readFromAmountMinor(t)
      if (t.toAccountId) map[t.toAccountId] = (map[t.toAccountId] ?? 0) + readToAmountMinor(t)
    } else {
      map[t.accountId] = (map[t.accountId] ?? 0) + signedCashDelta({ type: t.type, amount: readAmountMinor(t) })
    }
  }
  return map
}

/**
 * What each person owes or is owed, in the display currency.
 * Positive means you owe them; negative means they owe you.
 */
export function peopleBalances(
  transactions: Transaction[],
  convert: ConvertFn
): Record<string, number> {
  const map: Record<string, number> = {}
  for (const t of transactions) {
    if (!t.personId) continue
    if (t.type !== 'give' && t.type !== 'take') continue
    const converted = convert(readAmountMinor(t), t.currency)
    map[t.personId] = (map[t.personId] ?? 0) + signedCashDelta({ type: t.type, amount: converted })
  }
  return map
}

export function buildBreakdown(rows: CategoryRow[], total: number): CategoryBreakdownItem[] {
  const map = new Map<string, { amount: number; count: number }>()
  for (const r of rows) {
    const entry = map.get(r.categoryId) ?? { amount: 0, count: 0 }
    entry.amount += r.amount
    entry.count += 1
    map.set(r.categoryId, entry)
  }
  return Array.from(map.entries())
    .map(([categoryId, { amount, count }]) => ({
      categoryId,
      amount,
      count,
      share: total > 0 ? amount / total : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
}

export function buildPersonBreakdown(rows: PersonRow[]): PersonBreakdownItem[] {
  const map = new Map<string, { given: number; taken: number; count: number }>()
  for (const r of rows) {
    const entry = map.get(r.personId) ?? { given: 0, taken: 0, count: 0 }
    if (r.type === 'give') entry.given += r.amount
    else entry.taken += r.amount
    entry.count += 1
    map.set(r.personId, entry)
  }
  return Array.from(map.entries())
    .map(([personId, { given, taken, count }]) => ({
      personId,
      amount: taken - given,
      count,
      given,
      taken,
    }))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
}

/**
 * Number of days the period actually covers, never counting into the future.
 * `now` is injected so this stays deterministic under test.
 */
export function daysInPeriod(
  start: number,
  end: number,
  earliestTs: number,
  now: number = Date.now()
): number {
  const s = Math.max(start === -Infinity ? earliestTs : start, 0)
  const e = Math.min(end, now)
  return Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)))
}
