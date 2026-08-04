'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { listTransactions } from '@/lib/appwrite/collections'
import { convertCurrency } from '@/lib/currency/currencies'
import { useAuth } from '@/providers/auth-provider'
import { useSettings } from '@/providers/settings-provider'
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
  /** Milliseconds to subtract from start/end to compute previous period. 0 = no trend. */
  previousOffset: number
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

function daysInPeriod(start: number, end: number): number {
  const s = Math.max(start, 0)
  const e = Math.min(end, Date.now())
  return Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)))
}

const EMPTY: SummaryData = {
  income: 0, expense: 0, exchange: 0, savings: 0, savingsRate: 0,
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
    const { start, end, hasOpening, previousOffset } = range
    const toDefault = (amount: number, currency: string) =>
      convertCurrency(amount, currency, defaultCurrency, rates)

    function aggregate(periodStart: number, periodEnd: number) {
      let inc = 0; let exp = 0; let exch = 0; let exchNet = 0
      let incC = 0; let expC = 0; let exchC = 0; let giveC = 0; let takeC = 0
      let maxExp = 0; let openBal = 0
      const expRows: { categoryId: string; amount: number }[] = []
      const incRows: { categoryId: string; amount: number }[] = []
      const personRows: { personId: string; type: 'give' | 'take'; amount: number }[] = []

      for (const t of transactions) {
        const ts = new Date(t.date).getTime()
        const value = toDefault(t.amount, t.currency)
        const signed = t.type === 'income' || t.type === 'take' ? value : -value

        if (ts < periodStart) {
          if (hasOpening) {
            if (t.type === 'exchange') openBal += toDefault((t.toAmount ?? 0) - (t.fromAmount ?? 0), t.currency)
            else openBal += signed
          }
          continue
        }
        if (ts >= periodEnd) continue

        if (t.type === 'income') { inc += value; incC++; incRows.push({ categoryId: t.categoryId, amount: value }) }
        else if (t.type === 'expense') { exp += value; expC++; maxExp = Math.max(maxExp, value); expRows.push({ categoryId: t.categoryId, amount: value }) }
        else if (t.type === 'give') { exp += value; giveC++; maxExp = Math.max(maxExp, value); expRows.push({ categoryId: t.categoryId, amount: value }); personRows.push({ personId: t.personId ?? '', type: 'give', amount: value }) }
        else if (t.type === 'take') { inc += value; takeC++; incRows.push({ categoryId: t.categoryId, amount: value }); personRows.push({ personId: t.personId ?? '', type: 'take', amount: value }) }
        else if (t.type === 'exchange') { const diff = Math.abs((t.fromAmount ?? 0) - (t.toAmount ?? 0)); exch += diff; exchC++; exchNet += toDefault((t.toAmount ?? 0) - (t.fromAmount ?? 0), t.currency) }
      }

      const txnCount = incC + expC + exchC + giveC + takeC
      const savings = inc - exp
      return { inc, exp, exch, savings, incC, expC, exchC, giveC, takeC, txnCount, maxExp, openBal, incRows, expRows, personRows, exchNet }
    }

    const curr = aggregate(start, end)

    if (curr.txnCount === 0) return { ...EMPTY, openingBalance: curr.openBal, closingBalance: curr.openBal }

    let incomeTrend: number | null = null
    let expenseTrend: number | null = null
    let savingsTrend: number | null = null
    if (previousOffset > 0) {
      const prev = aggregate(start - previousOffset, end - previousOffset)
      if (prev.inc > 0) incomeTrend = ((curr.inc - prev.inc) / prev.inc) * 100
      if (prev.exp > 0) expenseTrend = ((curr.exp - prev.exp) / prev.exp) * 100
      if (prev.inc > 0) savingsTrend = prev.savings > 0 ? ((curr.savings - prev.savings) / prev.savings) * 100 : null
    }

    const days = daysInPeriod(start, end)
    const dailyAverage = curr.exp / days
    const avgTransaction = curr.txnCount > 0 ? (curr.inc + curr.exp) / curr.txnCount : 0

    const months: MonthlyBar[] = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mStart = Date.UTC(d.getFullYear(), d.getMonth(), 1)
      const mEnd = Date.UTC(d.getFullYear(), d.getMonth() + 1, 1)
      let mInc = 0; let mExp = 0
      for (const t of transactions) {
        const ts = new Date(t.date).getTime()
        if (ts < mStart || ts >= mEnd) continue
        const val = toDefault(t.amount, t.currency)
        if (t.type === 'income' || t.type === 'take') mInc += val
        else if (t.type === 'expense' || t.type === 'give') mExp += val
        else if (t.type === 'exchange') { mInc += 0 }
      }
      months.push({
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString(undefined, { month: 'short' }),
        income: mInc,
        expense: mExp,
      })
    }

    return {
      income: curr.inc, expense: curr.exp, exchange: curr.exch, savings: curr.savings,
      savingsRate: curr.inc > 0 ? curr.savings / curr.inc : 0,
      openingBalance: curr.openBal, closingBalance: curr.openBal + curr.savings + curr.exchNet,
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
  }, [transactions, range, defaultCurrency, rates])

  return { data, loading, refresh }
}
