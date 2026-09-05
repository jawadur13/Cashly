'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { listTransactions } from '@/lib/appwrite/collections'
import { exchangeNet, signedCashDelta } from '@/lib/calculations'
import { convertCurrency } from '@/lib/currency/currencies'
import { useAuth } from '@/providers/auth-provider'
import { useSettings } from '@/providers/settings-provider'
import { useAccounts } from './use-accounts'
import { useExchangeRates } from './use-exchange-rates'
import type { Transaction } from '@/lib/types'

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

export interface MonthlyBar {
  month: string
  label: string
  income: number
  expense: number
}

export interface SummaryData {
  income: number
  expense: number
  exchange: number
  peopleNet: number
  savings: number
  savingsRate: number
  openingBalance: number
  closingBalance: number
  transactionCount: number
  incomeCount: number
  expenseCount: number
  exchangeCount: number
  giveCount: number
  takeCount: number
  avgIncome: number
  avgExpense: number
  avgTransaction: number
  dailyAverage: number
  largestExpense: number
  expenseByCategory: CategoryBreakdownItem[]
  incomeByCategory: CategoryBreakdownItem[]
  personBreakdown: PersonBreakdownItem[]
  incomeTrend: number | null
  expenseTrend: number | null
  savingsTrend: number | null
  months: MonthlyBar[]
}

export interface SummaryRange {
  start: number
  end: number
  hasOpening: boolean
  /**
   * Explicit bounds of the period to compare against, or null for no trend.
   *
   * These are calendar dates built by the caller, not an offset subtracted from
   * start/end. A fixed millisecond offset cannot express "the previous month"
   * (months are 28-31 days) or "the previous year" (leap years), and using one
   * put the comparison window inside the period being viewed for 10 months of
   * every 12.
   */
  previousStart: number | null
  previousEnd: number | null
}

function buildBreakdown(
  rows: { categoryId: string; amount: number }[],
  total: number
): CategoryBreakdownItem[] {
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

function buildPersonBreakdown(
  rows: { personId: string; type: 'give' | 'take'; amount: number }[]
): PersonBreakdownItem[] {
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

function daysInPeriod(start: number, end: number, earliestTs: number): number {
  const s = Math.max(start === -Infinity ? earliestTs : start, 0)
  const e = Math.min(end, Date.now())
  return Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)))
}

const EMPTY: SummaryData = {
  income: 0, expense: 0, exchange: 0, peopleNet: 0, savings: 0, savingsRate: 0,
  openingBalance: 0, closingBalance: 0, transactionCount: 0,
  incomeCount: 0, expenseCount: 0, exchangeCount: 0, giveCount: 0, takeCount: 0,
  avgIncome: 0, avgExpense: 0, avgTransaction: 0, dailyAverage: 0,
  largestExpense: 0,
  expenseByCategory: [], incomeByCategory: [],
  personBreakdown: [],
  incomeTrend: null, expenseTrend: null, savingsTrend: null,
  months: [],
}

export function useSummary(range: SummaryRange) {
  const { user } = useAuth()
  const { defaultCurrency } = useSettings()
  const { rates } = useExchangeRates()
  const { accounts } = useAccounts()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const ignoreRef = useRef(false)

  const refresh = useCallback(async () => {
    if (!user) { setTransactions([]); setLoading(false); return }
    setLoading(true)
    try {
      const PAGE_SIZE = 500
      let allDocs: Transaction[] = []
      let offset = 0; let total = 0
      do {
        const res = await listTransactions({ userId: user.$id, limit: PAGE_SIZE, offset })
        if (ignoreRef.current) return
        // An empty page while offset < total would stall the offset and spin
        // this loop forever.
        if (res.documents.length === 0) break
        allDocs = allDocs.concat(res.documents)
        total = res.total; offset += res.documents.length
      } while (offset < total)
      if (!ignoreRef.current) setTransactions(allDocs)
    } catch { if (!ignoreRef.current) setTransactions([]) }
    finally { if (!ignoreRef.current) setLoading(false) }
  }, [user])

  useEffect(() => {
    ignoreRef.current = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
    return () => { ignoreRef.current = true }
  }, [refresh])

  const data = useMemo<SummaryData>(() => {
    const { start, end, hasOpening, previousStart, previousEnd } = range
    const toDefault = (amount: number, currency: string) =>
      convertCurrency(amount, currency, defaultCurrency, rates)

    const accountCurrency: Record<string, string> = {}
    for (const a of accounts) accountCurrency[a.$id] = a.currency
    // Each exchange leg carries its own account's currency, so the two sides
    // must be converted separately before subtracting.
    const netOfExchange = (t: Transaction) => exchangeNet(t, accountCurrency, defaultCurrency, rates)

    function aggregate(periodStart: number, periodEnd: number) {
      let inc = 0; let exp = 0; let exchNet = 0; let peopleNet = 0
      let incC = 0; let expC = 0; let exchC = 0; let giveC = 0; let takeC = 0
      let maxExp = 0; let openBal = 0
      const expRows: { categoryId: string; amount: number }[] = []
      const incRows: { categoryId: string; amount: number }[] = []
      const personRows: { personId: string; type: 'give' | 'take'; amount: number }[] = []

      for (const t of transactions) {
        const ts = new Date(t.date).getTime()
        const value = toDefault(t.amount, t.currency)
        const signed = signedCashDelta({ type: t.type, amount: value })

        if (ts < periodStart) {
          if (hasOpening) {
            if (t.type === 'exchange') openBal += netOfExchange(t)
            else openBal += signed
          }
          continue
        }
        if (ts >= periodEnd) continue

        if (t.type === 'income') { inc += value; incC++; incRows.push({ categoryId: t.categoryId, amount: value }) }
        else if (t.type === 'expense') { exp += value; expC++; maxExp = Math.max(maxExp, value); expRows.push({ categoryId: t.categoryId, amount: value }) }
        else if (t.type === 'give') { giveC++; peopleNet -= value; personRows.push({ personId: t.personId ?? '', type: 'give', amount: value }) }
        else if (t.type === 'take') { takeC++; peopleNet += value; personRows.push({ personId: t.personId ?? '', type: 'take', amount: value }) }
        else if (t.type === 'exchange') { exchC++; exchNet += netOfExchange(t) }
      }

      const txnCount = incC + expC + exchC + giveC + takeC
      const savings = inc - exp
      return { inc, exp, exchNet, peopleNet, savings, incC, expC, exchC, giveC, takeC, txnCount, maxExp, openBal, incRows, expRows, personRows }
    }

    const curr = aggregate(start, end)

    // The 12-month chart is a rolling window that does not depend on the
    // selected period, so it is built before the empty-period early return —
    // otherwise picking a quiet month would blank out a year of real history.
    // One pass buckets every transaction by month key; the previous version
    // re-scanned and re-converted the whole array once per month.
    const months: MonthlyBar[] = []
    const buckets = new Map<string, { income: number; expense: number }>()
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const bucket = { income: 0, expense: 0 }
      buckets.set(key, bucket)
      months.push({ month: key, label: d.toLocaleString(undefined, { month: 'short' }), income: 0, expense: 0 })
    }
    for (const t of transactions) {
      if (t.type !== 'income' && t.type !== 'expense') continue
      const d = new Date(t.date)
      const bucket = buckets.get(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
      if (!bucket) continue
      const val = toDefault(t.amount, t.currency)
      if (t.type === 'income') bucket.income += val
      else bucket.expense += val
    }
    for (const m of months) {
      const bucket = buckets.get(m.month)!
      m.income = bucket.income
      m.expense = bucket.expense
    }

    if (curr.txnCount === 0) {
      return { ...EMPTY, openingBalance: curr.openBal, closingBalance: curr.openBal, months }
    }

    let incomeTrend: number | null = null
    let expenseTrend: number | null = null
    let savingsTrend: number | null = null
    if (previousStart != null && previousEnd != null) {
      const prev = aggregate(previousStart, previousEnd)
      if (prev.txnCount > 0) {
        incomeTrend = prev.inc > 0 ? ((curr.inc - prev.inc) / prev.inc) * 100 : (curr.inc > 0 ? Infinity : null)
        expenseTrend = prev.exp > 0 ? ((curr.exp - prev.exp) / prev.exp) * 100 : (curr.exp > 0 ? Infinity : null)
        // Savings can be negative, and dividing by a negative baseline flips the
        // sign: halving a loss would read as -50%. Dividing by the magnitude
        // leaves direction entirely to the numerator.
        savingsTrend = prev.savings !== 0
          ? ((curr.savings - prev.savings) / Math.abs(prev.savings)) * 100
          : (curr.savings > 0 ? Infinity : curr.savings < 0 ? -Infinity : null)
      }
    }

    // curr.txnCount > 0 (checked above) guarantees at least one transaction exists
    const earliestTs = transactions.reduce((min, t) => Math.min(min, new Date(t.date).getTime()), Infinity)
    const days = daysInPeriod(start, end, earliestTs)
    const dailyAverage = curr.exp / days
    const avgTransaction = (curr.incC + curr.expC) > 0 ? (curr.inc + curr.exp) / (curr.incC + curr.expC) : 0

    return {
      income: curr.inc, expense: curr.exp, exchange: curr.exchNet, peopleNet: curr.peopleNet, savings: curr.savings,
      savingsRate: curr.inc > 0 ? curr.savings / curr.inc : 0,
      openingBalance: curr.openBal, closingBalance: curr.openBal + curr.savings + curr.exchNet + curr.peopleNet,
      transactionCount: curr.txnCount,
      incomeCount: curr.incC, expenseCount: curr.expC, exchangeCount: curr.exchC,
      giveCount: curr.giveC, takeCount: curr.takeC,
      avgIncome: curr.incC > 0 ? curr.inc / curr.incC : 0,
      avgExpense: curr.expC > 0 ? curr.exp / curr.expC : 0,
      avgTransaction,
      dailyAverage,
      largestExpense: curr.maxExp,
      expenseByCategory: buildBreakdown(curr.expRows, curr.exp),
      incomeByCategory: buildBreakdown(curr.incRows, curr.inc),
      personBreakdown: buildPersonBreakdown(curr.personRows),
      incomeTrend, expenseTrend, savingsTrend,
      months,
    }
  }, [transactions, accounts, range, defaultCurrency, rates])

  return { data, loading, refresh }
}
