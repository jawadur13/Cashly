import { describe, it, expect } from 'vitest'
import {
  aggregatePeriod,
  buildBreakdown,
  buildPersonBreakdown,
  daysInPeriod,
  monthPeriod,
  percentChange,
  previousMonthPeriod,
  previousYearPeriod,
  savingsRate,
  signedCashDelta,
  yearPeriod,
} from './calculations'
import type { Transaction } from './types'

/** Local-midnight timestamp, matching how the app builds period bounds. */
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime()
const iso = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString()

const tx = (over: Partial<Transaction>): Transaction =>
  ({
    $id: Math.random().toString(36).slice(2),
    userId: 'u1',
    accountId: 'acc_cash',
    type: 'expense',
    amount: 0,
    currency: 'BDT',
    categoryId: 'food',
    payee: '',
    note: '',
    date: iso(2026, 9, 5),
    ...over,
  }) as Transaction

/** Identity conversion — currency conversion is tested separately. */
const asIs = (amount: number) => amount

describe('signedCashDelta', () => {
  it('adds cash for income and take, removes it for expense and give', () => {
    expect(signedCashDelta({ type: 'income', amount: 100 })).toBe(100)
    expect(signedCashDelta({ type: 'take', amount: 100 })).toBe(100)
    expect(signedCashDelta({ type: 'expense', amount: 100 })).toBe(-100)
    expect(signedCashDelta({ type: 'give', amount: 100 })).toBe(-100)
  })

  it('leaves transfers to the caller', () => {
    expect(signedCashDelta({ type: 'exchange', amount: 100 })).toBe(0)
  })
})

describe('monthPeriod', () => {
  it('spans the first instant of the month to the first instant of the next', () => {
    expect(monthPeriod(2026, 9)).toEqual({ start: at(2026, 9, 1, 0), end: at(2026, 10, 1, 0) })
  })

  it('rolls over into the previous year for month 0', () => {
    expect(monthPeriod(2026, 0)).toEqual({ start: at(2025, 12, 1, 0), end: at(2026, 1, 1, 0) })
  })

  it('handles February in a leap year', () => {
    expect(monthPeriod(2028, 2)).toEqual({ start: at(2028, 2, 1, 0), end: at(2028, 3, 1, 0) })
  })
})

describe('previousMonthPeriod — issue #1', () => {
  // These are the exact cases the old millisecond-offset maths got wrong.
  it('September 2026 compares against the WHOLE of August (incl. 31 Aug)', () => {
    expect(previousMonthPeriod(2026, 9)).toEqual({ start: at(2026, 8, 1, 0), end: at(2026, 9, 1, 0) })
  })

  it('October 2026 compares against September only — no October days leak in', () => {
    expect(previousMonthPeriod(2026, 10)).toEqual({ start: at(2026, 9, 1, 0), end: at(2026, 10, 1, 0) })
  })

  it('March 2026 compares against February, not February plus three days', () => {
    expect(previousMonthPeriod(2026, 3)).toEqual({ start: at(2026, 2, 1, 0), end: at(2026, 3, 1, 0) })
  })

  it('January compares against December of the previous year', () => {
    expect(previousMonthPeriod(2026, 1)).toEqual({ start: at(2025, 12, 1, 0), end: at(2026, 1, 1, 0) })
  })
})

describe('previousYearPeriod — issue #13', () => {
  it('2026 compares against all of 2025', () => {
    expect(previousYearPeriod(2026)).toEqual({ start: at(2025, 1, 1, 0), end: at(2026, 1, 1, 0) })
  })

  it('2025 compares against all of leap-year 2024, including 31 December', () => {
    expect(previousYearPeriod(2025)).toEqual({ start: at(2024, 1, 1, 0), end: at(2025, 1, 1, 0) })
  })

  it('yearPeriod spans Jan 1 to Jan 1', () => {
    expect(yearPeriod(2026)).toEqual({ start: at(2026, 1, 1, 0), end: at(2027, 1, 1, 0) })
  })
})

describe('percentChange — issue #3', () => {
  it('reports a plain rise and fall against a positive baseline', () => {
    expect(percentChange(1500, 1000)).toBe(50)
    expect(percentChange(500, 1000)).toBe(-50)
  })

  it('treats a shrinking loss as an improvement', () => {
    // Lost 1000 last month, only 200 this month — that is progress.
    expect(percentChange(-200, -1000)).toBe(80)
  })

  it('treats a growing loss as a decline', () => {
    expect(percentChange(-1000, -200)).toBe(-400)
  })

  it('treats a loss turning into a profit as an improvement', () => {
    expect(percentChange(500, -500)).toBe(200)
  })

  it('returns null when nothing changed from nothing', () => {
    expect(percentChange(0, 0)).toBeNull()
  })

  it('returns Infinity when something grew out of nothing', () => {
    expect(percentChange(500, 0)).toBe(Infinity)
  })
})

describe('savingsRate — issue #8', () => {
  it('is the share of income kept', () => {
    expect(savingsRate(2000, 10000)).toBe(0.2)
  })

  it('is null when there was no income, rather than a misleading zero', () => {
    expect(savingsRate(-30000, 0)).toBeNull()
  })
})

describe('aggregatePeriod', () => {
  const txns = [
    tx({ type: 'income', amount: 60000, categoryId: 'salary', date: iso(2026, 8, 5) }),
    tx({ type: 'expense', amount: 15000, categoryId: 'food', date: iso(2026, 8, 10) }),
    tx({ type: 'expense', amount: 25000, categoryId: 'rent', date: iso(2026, 8, 31) }),
    tx({ type: 'income', amount: 60000, categoryId: 'salary', date: iso(2026, 9, 5) }),
    tx({ type: 'expense', amount: 12000, categoryId: 'food', date: iso(2026, 9, 6) }),
    tx({ type: 'give', amount: 5000, personId: 'p_rahim', date: iso(2026, 9, 7) }),
    tx({ type: 'take', amount: 2000, personId: 'p_karim', date: iso(2026, 9, 7) }),
    tx({
      type: 'exchange', amount: 20, date: iso(2026, 9, 7),
      fromAccountId: 'acc_cash', toAccountId: 'acc_bank', fromAmount: 10000, toAmount: 9980,
    }),
  ]

  it('totals the selected month only', () => {
    const sep = monthPeriod(2026, 9)
    const r = aggregatePeriod(txns, { ...sep, hasOpening: true, convert: asIs })
    expect(r.income).toBe(60000)
    expect(r.expense).toBe(12000)
    expect(r.peopleNet).toBe(-3000)
    expect(r.exchangeNet).toBe(-20)
    expect(r.savings).toBe(48000)
    expect(r.transactionCount).toBe(5)
  })

  it('rolls everything before the period into the opening balance', () => {
    const sep = monthPeriod(2026, 9)
    const r = aggregatePeriod(txns, { ...sep, hasOpening: true, convert: asIs })
    // Aug: +60000 income, -15000 food, -25000 rent
    expect(r.openingBalance).toBe(20000)
  })

  it('includes a transaction dated the last day of the previous month — issue #1', () => {
    const aug = previousMonthPeriod(2026, 9)
    const r = aggregatePeriod(txns, { ...aug, hasOpening: false, convert: asIs })
    // 15,000 food + 25,000 rent on the 31st. The rent must not be dropped.
    expect(r.expense).toBe(40000)
  })

  it('excludes a transaction dated the first day of the following month', () => {
    const aug = previousMonthPeriod(2026, 9)
    const r = aggregatePeriod(txns, { ...aug, hasOpening: false, convert: asIs })
    expect(r.income).toBe(60000) // only August's salary, not September's
  })

  it('converts each amount through the supplied converter', () => {
    const usd = [tx({ type: 'income', amount: 500, currency: 'USD', date: iso(2026, 9, 7) })]
    const r = aggregatePeriod(usd, {
      ...monthPeriod(2026, 9),
      hasOpening: false,
      convert: (a, c) => (c === 'USD' ? a * 123.25 : a),
    })
    expect(r.income).toBeCloseTo(61625, 5)
  })
})

describe('buildBreakdown', () => {
  it('groups by category, sums, counts and shares', () => {
    const rows = [
      { categoryId: 'food', amount: 300 },
      { categoryId: 'food', amount: 100 },
      { categoryId: 'rent', amount: 600 },
    ]
    const out = buildBreakdown(rows, 1000)
    expect(out[0]).toEqual({ categoryId: 'rent', amount: 600, count: 1, share: 0.6 })
    expect(out[1]).toEqual({ categoryId: 'food', amount: 400, count: 2, share: 0.4 })
  })

  it('reports a zero share rather than dividing by zero', () => {
    expect(buildBreakdown([{ categoryId: 'food', amount: 0 }], 0)[0].share).toBe(0)
  })
})

describe('buildPersonBreakdown', () => {
  it('nets taken against given per person', () => {
    const out = buildPersonBreakdown([
      { personId: 'p1', type: 'give', amount: 5000 },
      { personId: 'p1', type: 'take', amount: 2000 },
    ])
    expect(out[0]).toEqual({ personId: 'p1', amount: -3000, count: 2, given: 5000, taken: 2000 })
  })
})

describe('daysInPeriod', () => {
  const now = at(2026, 9, 8, 15)

  it('counts only elapsed days for the current month', () => {
    const sep = monthPeriod(2026, 9)
    expect(daysInPeriod(sep.start, sep.end, 0, now)).toBe(8)
  })

  it('counts the full length of a month already past', () => {
    const jan = monthPeriod(2026, 1)
    expect(daysInPeriod(jan.start, jan.end, 0, now)).toBe(31)
  })

  it('falls back to the earliest transaction for all-time', () => {
    expect(daysInPeriod(-Infinity, Infinity, at(2026, 9, 1, 0), now)).toBe(8)
  })

  it('never returns zero', () => {
    expect(daysInPeriod(now, now, 0, now)).toBe(1)
  })
})
