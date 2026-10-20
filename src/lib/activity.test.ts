import { describe, expect, it } from 'vitest'
import {
  categoryUsage,
  groupByDay,
  incomeExpenseTotals,
  matchesFilter,
  personRecency,
  recentPayees,
  sortNewestFirst,
  totalsByCategory,
} from './activity'
import type { Transaction } from './types'

let n = 0
function tx(over: Partial<Transaction>): Transaction {
  n += 1
  return {
    $id: `t${String(n).padStart(3, '0')}`,
    $createdAt: '2026-10-01T00:00:00.000Z',
    $updatedAt: '2026-10-01T00:00:00.000Z',
    userId: 'u',
    accountId: 'cash',
    type: 'expense',
    amount: 0,
    amountMinor: 1000,
    currency: 'BDT',
    categoryId: 'food',
    payee: '',
    note: '',
    date: new Date(2026, 9, 10, 12).toISOString(),
    ...over,
  }
}

const labels = {
  categoryName: (id: string) => ({ food: 'Food', salary: 'Salary' })[id],
  personName: (id: string) => ({ p1: 'Rafi Ahmed' })[id],
  accountName: (id: string) => ({ cash: 'Cash', bank: 'City Bank' })[id],
}

describe('matchesFilter', () => {
  it('matches a transfer by either of its accounts', () => {
    const t = tx({ type: 'exchange', accountId: 'bank', fromAccountId: 'bank', toAccountId: 'cash' })
    expect(matchesFilter(t, { accountId: 'cash' })).toBe(true)
    expect(matchesFilter(t, { accountId: 'bkash' })).toBe(false)
  })

  it('filters by local month', () => {
    const t = tx({ date: new Date(2026, 9, 31, 23, 30).toISOString() })
    expect(matchesFilter(t, { month: '2026-10' })).toBe(true)
    expect(matchesFilter(t, { month: '2026-11' })).toBe(false)
  })

  it('searches note, payee, category, person and account names, case-insensitively', () => {
    expect(matchesFilter(tx({ note: 'Groceries' }), { query: 'grocer' }, labels)).toBe(true)
    expect(matchesFilter(tx({ payee: 'Shwapno' }), { query: 'SHWAP' }, labels)).toBe(true)
    expect(matchesFilter(tx({}), { query: 'food' }, labels)).toBe(true)
    expect(matchesFilter(tx({ type: 'give', personId: 'p1', categoryId: '' }), { query: 'rafi' }, labels)).toBe(true)
    expect(matchesFilter(tx({ accountId: 'bank' }), { query: 'city' }, labels)).toBe(true)
    expect(matchesFilter(tx({}), { query: 'rent' }, labels)).toBe(false)
  })
})

describe('sorting and grouping', () => {
  it('orders newest first with a stable id tiebreak, and groups by day', () => {
    const same = new Date(2026, 9, 12, 9).toISOString()
    const a = tx({ date: same })
    const b = tx({ date: same })
    const c = tx({ date: new Date(2026, 9, 11, 20).toISOString() })
    const sorted = sortNewestFirst([c, a, b])
    expect(sorted.map((t) => t.$id)).toEqual([b.$id, a.$id, c.$id])
    const groups = groupByDay(sorted)
    expect(groups.map((g) => [g.key, g.items.length])).toEqual([['2026-10-12', 2], ['2026-10-11', 1]])
  })
})

describe('incomeExpenseTotals', () => {
  it('converts each row before adding and ignores transfers and give/take', () => {
    const toBdt = (minor: number, currency: string) => (currency === 'USD' ? minor * 120 : minor)
    const totals = incomeExpenseTotals(
      [
        tx({ type: 'income', amountMinor: 100000 }),
        tx({ type: 'income', amountMinor: 1000, currency: 'USD' }),
        tx({ type: 'expense', amountMinor: 25000 }),
        tx({ type: 'exchange', amountMinor: 99999 }),
        tx({ type: 'give', amountMinor: 5000 }),
        tx({ type: 'take', amountMinor: 7000 }),
      ],
      toBdt
    )
    expect(totals).toEqual({ income: 220000, expense: 25000, net: 195000 })
  })

  it('reads legacy rows through the float fallback', () => {
    const legacy = tx({ type: 'expense', amountMinor: undefined, amount: 12.5 })
    expect(incomeExpenseTotals([legacy], (m) => m).expense).toBe(1250)
  })
})

describe('ordering helpers', () => {
  it('counts category use per type', () => {
    const usage = categoryUsage([tx({}), tx({}), tx({ categoryId: 'salary', type: 'income' })], 'expense')
    expect(usage.get('food')).toBe(2)
    expect(usage.has('salary')).toBe(false)
  })

  it('tracks the latest activity per person', () => {
    const r = personRecency([
      tx({ personId: 'p1', date: new Date(2026, 0, 1).toISOString() }),
      tx({ personId: 'p1', date: new Date(2026, 5, 1).toISOString() }),
    ])
    expect(r.get('p1')).toBe(new Date(2026, 5, 1).getTime())
  })

  it('lists distinct recent payees, newest first', () => {
    const payees = recentPayees([
      tx({ payee: 'Daraz', date: new Date(2026, 0, 1).toISOString() }),
      tx({ payee: 'Pathao', date: new Date(2026, 2, 1).toISOString() }),
      tx({ payee: 'daraz', date: new Date(2026, 3, 1).toISOString() }),
    ])
    expect(payees).toEqual(['daraz', 'Pathao'])
  })
})

describe('totalsByCategory', () => {
  it('sums per category in the display currency, largest first, with shares', () => {
    const toBdt = (minor: number, currency: string) => (currency === 'USD' ? minor * 100 : minor)
    const rows = totalsByCategory(
      [
        tx({ categoryId: 'food', amountMinor: 3000 }),
        tx({ categoryId: 'rent', amountMinor: 50, currency: 'USD' }),
        tx({ categoryId: 'food', amountMinor: 2000 }),
        tx({ type: 'income', categoryId: 'salary', amountMinor: 99999 }),
      ],
      'expense',
      toBdt
    )
    expect(rows.map((r) => [r.categoryId, r.amount])).toEqual([['food', 5000], ['rent', 5000]].sort((a, b) => (b[1] as number) - (a[1] as number)))
    expect(rows.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1)
  })
})
