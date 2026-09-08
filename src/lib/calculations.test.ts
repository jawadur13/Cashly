import { describe, it, expect } from 'vitest'
import {
  accountBalances,
  aggregatePeriod,
  buildBreakdown,
  buildPersonBreakdown,
  daysInPeriod,
  monthPeriod,
  peopleBalances,
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

/** Whole taka expressed in paisa — calculations work in minor units. */
const tk = (major: number) => Math.round(major * 100)

/**
 * `amount`/`fromAmount`/`toAmount` are given in major units for readability and
 * mirrored into the minor-unit columns the app actually reads.
 */
const tx = (over: Partial<Transaction> & { amount?: number }): Transaction => {
  const base = {
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
  } as Transaction
  return {
    ...base,
    amountMinor: tk(base.amount ?? 0),
    ...(base.fromAmount != null ? { fromAmountMinor: tk(base.fromAmount) } : {}),
    ...(base.toAmount != null ? { toAmountMinor: tk(base.toAmount) } : {}),
  } as Transaction
}

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

  it('returns negative infinity when it fell out of nothing', () => {
    // Break-even last month, 50,000 lost this month. Reporting bare Infinity
    // would let a caller colouring on `trend > 0` paint this as good news.
    expect(percentChange(-50000, 0)).toBe(-Infinity)
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
    expect(r.income).toBe(tk(60000))
    expect(r.expense).toBe(tk(12000))
    expect(r.peopleNet).toBe(tk(-3000))
    expect(r.exchangeNet).toBe(tk(-20))
    expect(r.savings).toBe(tk(48000))
    expect(r.transactionCount).toBe(5)
  })

  it('rolls everything before the period into the opening balance', () => {
    const sep = monthPeriod(2026, 9)
    const r = aggregatePeriod(txns, { ...sep, hasOpening: true, convert: asIs })
    // Aug: +60000 income, -15000 food, -25000 rent
    expect(r.openingBalance).toBe(tk(20000))
  })

  it('includes a transaction dated the last day of the previous month — issue #1', () => {
    const aug = previousMonthPeriod(2026, 9)
    const r = aggregatePeriod(txns, { ...aug, hasOpening: false, convert: asIs })
    // 15,000 food + 25,000 rent on the 31st. The rent must not be dropped.
    expect(r.expense).toBe(tk(40000))
  })

  it('excludes a transaction dated the first day of the following month', () => {
    const aug = previousMonthPeriod(2026, 9)
    const r = aggregatePeriod(txns, { ...aug, hasOpening: false, convert: asIs })
    expect(r.income).toBe(tk(60000)) // only August's salary, not September's
  })

  it('converts each amount through the supplied converter', () => {
    const usd = [tx({ type: 'income', amount: 500, currency: 'USD', date: iso(2026, 9, 7) })]
    const r = aggregatePeriod(usd, {
      ...monthPeriod(2026, 9),
      hasOpening: false,
      convert: (a, c) => Math.round(c === 'USD' ? a * 123.25 : a),
    })
    expect(r.income).toBe(tk(61625))
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

describe('accountBalances', () => {
  it('applies income and expense to the owning account', () => {
    const b = accountBalances([
      tx({ type: 'income', amount: 1000, accountId: 'a' }),
      tx({ type: 'expense', amount: 300, accountId: 'a' }),
    ])
    expect(b.a).toBe(tk(700))
  })

  it('moves money out of one account and into the other for a transfer', () => {
    const b = accountBalances([
      tx({
        type: 'exchange', amount: 20, accountId: 'a',
        fromAccountId: 'a', toAccountId: 'b', fromAmount: 1000, toAmount: 980,
      }),
    ])
    expect(b.a).toBe(tk(-1000))
    expect(b.b).toBe(tk(980))
  })

  it('applies give and take to the account the cash moved through', () => {
    const b = accountBalances([
      tx({ type: 'give', amount: 500, accountId: 'a', personId: 'p1' }),
      tx({ type: 'take', amount: 200, accountId: 'a', personId: 'p2' }),
    ])
    expect(b.a).toBe(tk(-300))
  })
})

describe('deleting an account by reassignment — issue #4', () => {
  // Option C: transactions move to another account, nothing is deleted.
  // The grand total must be identical before and after.
  const before = [
    tx({ type: 'income', amount: 5000, accountId: 'old' }),
    tx({ type: 'expense', amount: 1200, accountId: 'old' }),
    tx({ type: 'give', amount: 800, accountId: 'old', personId: 'p1' }),
    tx({ type: 'income', amount: 2000, accountId: 'keep' }),
  ]
  const reassign = (txns: Transaction[], from: string, to: string) =>
    txns.map((t) => ({
      ...t,
      accountId: t.accountId === from ? to : t.accountId,
      fromAccountId: t.fromAccountId === from ? to : t.fromAccountId,
      toAccountId: t.toAccountId === from ? to : t.toAccountId,
    })) as Transaction[]

  const sum = (b: Record<string, number>) => Object.values(b).reduce((a, n) => a + n, 0)

  it('preserves the grand total', () => {
    const after = reassign(before, 'old', 'keep')
    expect(sum(accountBalances(after))).toBe(sum(accountBalances(before)))
  })

  it('leaves no balance behind on the removed account', () => {
    const after = accountBalances(reassign(before, 'old', 'keep'))
    expect(after.old).toBeUndefined()
    expect(after.keep).toBe(tk(5000 - 1200 - 800 + 2000))
  })

  it('preserves people balances, since give/take are moved not deleted', () => {
    const conv = (a: number) => a
    expect(peopleBalances(reassign(before, 'old', 'keep'), conv)).toEqual(
      peopleBalances(before, conv)
    )
  })

  it('keeps a transfer correct when its other side is the destination', () => {
    // Transfer old -> keep, then old is merged into keep. The transfer becomes
    // keep -> keep, which must still cost exactly the 20 fee and nothing more.
    const withTransfer = [
      tx({
        type: 'exchange', amount: 20, accountId: 'old',
        fromAccountId: 'old', toAccountId: 'keep', fromAmount: 1000, toAmount: 980,
      }),
    ]
    const totalBefore = sum(accountBalances(withTransfer))
    const after = accountBalances(reassign(withTransfer, 'old', 'keep'))
    expect(sum(after)).toBe(totalBefore)
    expect(after.keep).toBe(tk(-20))
  })
})

describe('peopleBalances', () => {
  it('is negative when they owe you, positive when you owe them', () => {
    const b = peopleBalances(
      [
        tx({ type: 'give', amount: 5000, personId: 'rahim' }),
        tx({ type: 'take', amount: 2000, personId: 'karim' }),
      ],
      (a) => a
    )
    expect(b.rahim).toBe(tk(-5000))
    expect(b.karim).toBe(tk(2000))
  })

  it('ignores transactions that are not give or take', () => {
    const b = peopleBalances([tx({ type: 'expense', amount: 100, personId: 'rahim' })], (a) => a)
    expect(b.rahim).toBeUndefined()
  })

  it('converts into the display currency', () => {
    const b = peopleBalances(
      [tx({ type: 'give', amount: 100, currency: 'USD', personId: 'rahim' })],
      (a, c) => Math.round(c === 'USD' ? a * 123.25 : a)
    )
    expect(b.rahim).toBe(tk(-12325))
  })
})
