'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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

export interface SummaryData {
  income: number
  expense: number
  savings: number
  savingsRate: number
  openingBalance: number
  closingBalance: number
  transactionCount: number
  incomeCount: number
  expenseCount: number
  avgIncome: number
  avgExpense: number
  largestExpense: number
  expenseByCategory: CategoryBreakdownItem[]
  incomeByCategory: CategoryBreakdownItem[]
}

export interface SummaryRange {
  /** Inclusive start timestamp (ms). Use -Infinity for "all time". */
  start: number
  /** Exclusive end timestamp (ms). Use Infinity for "up to now". */
  end: number
  /** Whether an opening/closing balance is meaningful for this range. */
  hasOpening: boolean
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

const EMPTY: SummaryData = {
  income: 0,
  expense: 0,
  savings: 0,
  savingsRate: 0,
  openingBalance: 0,
  closingBalance: 0,
  transactionCount: 0,
  incomeCount: 0,
  expenseCount: 0,
  avgIncome: 0,
  avgExpense: 0,
  largestExpense: 0,
  expenseByCategory: [],
  incomeByCategory: [],
}

export function useSummary(range: SummaryRange) {
  const { user } = useAuth()
  const { defaultCurrency } = useSettings()
  const { rates } = useExchangeRates()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setTransactions([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await listTransactions({ userId: user.$id, limit: 1000 })
      setTransactions(res.documents)
    } catch {
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  const data = useMemo<SummaryData>(() => {
    const { start, end, hasOpening } = range
    const toDefault = (amount: number, currency: string) =>
      convertCurrency(amount, currency, defaultCurrency, rates)

    let openingBalance = 0
    let income = 0
    let expense = 0
    let incomeCount = 0
    let expenseCount = 0
    let largestExpense = 0
    const expenseRows: { categoryId: string; amount: number }[] = []
    const incomeRows: { categoryId: string; amount: number }[] = []

    for (const t of transactions) {
      const ts = new Date(t.date).getTime()
      const value = toDefault(t.amount, t.currency)
      const signed = t.type === 'income' ? value : -value

      if (ts < start) {
        // Everything before the range start contributes to the opening balance.
        if (hasOpening) openingBalance += signed
        continue
      }
      if (ts >= end) continue

      if (t.type === 'income') {
        income += value
        incomeCount += 1
        incomeRows.push({ categoryId: t.categoryId, amount: value })
      } else {
        expense += value
        expenseCount += 1
        largestExpense = Math.max(largestExpense, value)
        expenseRows.push({ categoryId: t.categoryId, amount: value })
      }
    }

    const transactionCount = incomeCount + expenseCount
    if (transactionCount === 0) {
      return { ...EMPTY, openingBalance, closingBalance: openingBalance }
    }

    const savings = income - expense
    return {
      income,
      expense,
      savings,
      savingsRate: income > 0 ? savings / income : 0,
      openingBalance,
      closingBalance: openingBalance + savings,
      transactionCount,
      incomeCount,
      expenseCount,
      avgIncome: incomeCount > 0 ? income / incomeCount : 0,
      avgExpense: expenseCount > 0 ? expense / expenseCount : 0,
      largestExpense,
      expenseByCategory: buildBreakdown(expenseRows, expense),
      incomeByCategory: buildBreakdown(incomeRows, income),
    }
  }, [transactions, range, defaultCurrency, rates])

  return { data, loading, refresh }
}
