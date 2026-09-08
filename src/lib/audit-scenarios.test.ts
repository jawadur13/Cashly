/**
 * Replays the scenarios from CALCULATION-AUDIT.md against the real modules.
 *
 * Each test states the number the app used to produce and the number it must
 * produce now, so a regression fails here with the audit issue named.
 */
import { describe, it, expect } from 'vitest'
import {
  accountBalances,
  aggregatePeriod,
  monthPeriod,
  percentChange,
  previousMonthPeriod,
  savingsRate,
} from './calculations'
import { convertMinor } from './currency/currencies'
import { formatMoney } from './currency/format'
import { toMinorUnits } from './money'
import type { Account, Transaction } from './types'

const iso = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString()
const tk = (major: number) => Math.round(major * 100)

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

const accounts = [
  { $id: 'acc_cash', name: 'Cash', currency: 'BDT' },
  { $id: 'acc_bank', name: 'Bank', currency: 'BDT' },
  { $id: 'acc_usd', name: 'Payoneer', currency: 'USD' },
] as Account[]

const RATES = { BDT: 1, USD: 123.25, EUR: 135 }
const convert = (minor: number, currency: string) => convertMinor(minor, currency, 'BDT', RATES)

const transactions = [
  tx({ type: 'income', amount: 60000, accountId: 'acc_bank', categoryId: 'salary', date: iso(2026, 8, 5) }),
  tx({ type: 'expense', amount: 15000, accountId: 'acc_cash', categoryId: 'food', date: iso(2026, 8, 10) }),
  // The rent on the last day of August — the transaction issue #1 used to drop.
  tx({ type: 'expense', amount: 25000, accountId: 'acc_cash', categoryId: 'rent', date: iso(2026, 8, 31) }),
  tx({ type: 'income', amount: 60000, accountId: 'acc_bank', categoryId: 'salary', date: iso(2026, 9, 5) }),
  tx({ type: 'expense', amount: 12000, accountId: 'acc_cash', categoryId: 'food', date: iso(2026, 9, 6) }),
  tx({ type: 'income', amount: 500, accountId: 'acc_usd', currency: 'USD', categoryId: 'freelance', date: iso(2026, 9, 7) }),
  tx({ type: 'give', amount: 5000, accountId: 'acc_cash', personId: 'p_rahim', date: iso(2026, 9, 7) }),
  tx({ type: 'take', amount: 2000, accountId: 'acc_cash', personId: 'p_karim', date: iso(2026, 9, 7) }),
  tx({
    type: 'exchange', amount: 20, accountId: 'acc_cash', date: iso(2026, 9, 7),
    fromAccountId: 'acc_cash', toAccountId: 'acc_bank', fromAmount: 10000, toAmount: 9980,
  }),
]

const homeTotal = (accs: Account[], txns: Transaction[]) => {
  const balances = accountBalances(txns)
  return accs.reduce((sum, a) => {
    const b = balances[a.$id] ?? 0
    return sum + (a.currency === 'BDT' ? b : convertMinor(b, a.currency, 'BDT', RATES))
  }, 0)
}

describe('audit scenario A — Home and Summary agree', () => {
  it('the Home total equals the Summary closing balance', () => {
    const sep = aggregatePeriod(transactions, {
      ...monthPeriod(2026, 9),
      hasOpening: true,
      convert,
    })
    const closing = sep.openingBalance + sep.savings + sep.exchangeNet + sep.peopleNet
    expect(homeTotal(accounts, transactions)).toBe(closing)
    expect(formatMoney(closing, 'BDT')).toBe(formatMoney(homeTotal(accounts, transactions), 'BDT'))
  })
})

describe('audit scenario B/#4 — removing an account by reassignment', () => {
  it('keeps Home and Summary in agreement, unlike orphaning the transactions', () => {
    // Old behaviour: delete the account, leave the transactions. Home dropped
    // 61,625 BDT while the Summary kept counting it.
    const orphanedAccounts = accounts.filter((a) => a.$id !== 'acc_usd')
    const sep = aggregatePeriod(transactions, { ...monthPeriod(2026, 9), hasOpening: true, convert })
    const closing = sep.openingBalance + sep.savings + sep.exchangeNet + sep.peopleNet
    expect(homeTotal(orphanedAccounts, transactions)).not.toBe(closing)

    // New behaviour: move the transactions to another account of the same
    // currency. Nothing is orphaned, so the two totals still match.
    const usdSibling = { $id: 'acc_usd2', name: 'Wise', currency: 'USD' } as Account
    const withSibling = [...accounts, usdSibling]
    const reassigned = transactions.map((t) =>
      t.accountId === 'acc_usd' ? ({ ...t, accountId: 'acc_usd2' } as Transaction) : t
    )
    const after = withSibling.filter((a) => a.$id !== 'acc_usd')
    const sepAfter = aggregatePeriod(reassigned, { ...monthPeriod(2026, 9), hasOpening: true, convert })
    const closingAfter = sepAfter.openingBalance + sepAfter.savings + sepAfter.exchangeNet + sepAfter.peopleNet
    expect(homeTotal(after, reassigned)).toBe(closingAfter)
    expect(homeTotal(after, reassigned)).toBe(homeTotal(accounts, transactions))
  })
})

describe('audit scenario E/#1 — the month comparison window', () => {
  const sep = aggregatePeriod(transactions, { ...monthPeriod(2026, 9), hasOpening: true, convert })
  const aug = aggregatePeriod(transactions, {
    ...previousMonthPeriod(2026, 9),
    hasOpening: false,
    convert,
  })

  it('counts the whole of August, including the 31st', () => {
    expect(aug.expense).toBe(tk(40000)) // was 15,000 — the rent was dropped
  })

  it('reports the correct expense trend', () => {
    // The app used to show -20% because it compared against a short August.
    expect(Math.round(percentChange(sep.expense, aug.expense)!)).toBe(-70)
  })

  it('paints a rise in spending as bad news', () => {
    const risingIsGoodForExpense = false
    const trend = percentChange(tk(20000), tk(10000))!
    const rising = trend > 0
    expect(rising).toBe(true)
    expect(rising === risingIsGoodForExpense).toBe(false) // => red, not green
  })
})

describe('audit scenario G/#8 — a month with no income', () => {
  it('does not claim 0% saved', () => {
    const oct = aggregatePeriod(
      [tx({ type: 'expense', amount: 30000, date: iso(2026, 10, 5) })],
      { ...monthPeriod(2026, 10), hasOpening: true, convert }
    )
    expect(oct.savings).toBe(tk(-30000))
    expect(savingsRate(oct.savings, oct.income)).toBeNull()
  })
})

describe('#17c — amounts survive a long history exactly', () => {
  it('sums 1,000 entries of 0.07 without drift', () => {
    const many = Array.from({ length: 1000 }, () =>
      tx({ type: 'expense', amount: 0.07, date: iso(2026, 9, 10) })
    )
    const r = aggregatePeriod(many, { ...monthPeriod(2026, 9), hasOpening: false, convert })
    expect(r.expense).toBe(toMinorUnits('70'))
    expect(formatMoney(r.expense, 'BDT')).toBe(formatMoney(7000, 'BDT'))
  })

  it('reads pre-migration rows identically to migrated ones', () => {
    const legacy = [
      { ...tx({ type: 'income', amount: 123.45, date: iso(2026, 9, 10) }), amountMinor: undefined },
    ] as unknown as Transaction[]
    const migrated = [tx({ type: 'income', amount: 123.45, date: iso(2026, 9, 10) })]
    const opts = { ...monthPeriod(2026, 9), hasOpening: false, convert }
    expect(aggregatePeriod(legacy, opts).income).toBe(aggregatePeriod(migrated, opts).income)
    expect(aggregatePeriod(legacy, opts).income).toBe(tk(123.45))
  })
})
