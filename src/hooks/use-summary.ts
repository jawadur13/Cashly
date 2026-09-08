'use client'

import { useMemo } from 'react'
import {
  aggregatePeriod,
  buildBreakdown,
  buildPersonBreakdown,
  daysInPeriod,
  percentChange,
  savingsRate as computeSavingsRate,
  type CategoryBreakdownItem,
  type PersonBreakdownItem,
} from '@/lib/calculations'
import { convertCurrency } from '@/lib/currency/currencies'
import { useAllTransactions } from '@/providers/all-transactions-provider'
import { useSettings } from '@/providers/settings-provider'
import { useExchangeRates } from './use-exchange-rates'

export type { CategoryBreakdownItem, PersonBreakdownItem }

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
  /** Fraction of income kept, or null when there was no income to keep. */
  savingsRate: number | null
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
  /** Explicit previous window for trends, or null when there is nothing to compare against. */
  previous: { start: number; end: number } | null
}

const EMPTY: SummaryData = {
  income: 0, expense: 0, exchange: 0, peopleNet: 0, savings: 0, savingsRate: null,
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
  const { defaultCurrency } = useSettings()
  const { rates } = useExchangeRates()
  const { transactions, loading, refresh } = useAllTransactions()

  const data = useMemo<SummaryData>(() => {
    const { start, end, hasOpening, previous } = range
    const convert = (amount: number, currency: string) =>
      convertCurrency(amount, currency, defaultCurrency, rates)

    const curr = aggregatePeriod(transactions, { start, end, hasOpening, convert })

    if (curr.transactionCount === 0) {
      return { ...EMPTY, openingBalance: curr.openingBalance, closingBalance: curr.openingBalance }
    }

    let incomeTrend: number | null = null
    let expenseTrend: number | null = null
    let savingsTrend: number | null = null
    if (previous) {
      const prev = aggregatePeriod(transactions, {
        start: previous.start,
        end: previous.end,
        hasOpening: false,
        convert,
      })
      if (prev.transactionCount > 0) {
        incomeTrend = percentChange(curr.income, prev.income)
        expenseTrend = percentChange(curr.expense, prev.expense)
        savingsTrend = percentChange(curr.savings, prev.savings)
      }
    }

    // curr.transactionCount > 0 (checked above) guarantees at least one transaction exists
    const earliestTs = transactions.reduce((min, t) => Math.min(min, new Date(t.date).getTime()), Infinity)
    const days = daysInPeriod(start, end, earliestTs)
    const dailyAverage = curr.expense / days
    const avgTransaction = (curr.incomeCount + curr.expenseCount) > 0
      ? (curr.income + curr.expense) / (curr.incomeCount + curr.expenseCount)
      : 0

    const months: MonthlyBar[] = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()
      const bucket = aggregatePeriod(transactions, {
        start: mStart,
        end: mEnd,
        hasOpening: false,
        convert,
      })
      months.push({
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString(undefined, { month: 'short' }),
        income: bucket.income,
        expense: bucket.expense,
      })
    }

    return {
      income: curr.income, expense: curr.expense, exchange: curr.exchangeNet,
      peopleNet: curr.peopleNet, savings: curr.savings,
      savingsRate: computeSavingsRate(curr.savings, curr.income),
      openingBalance: curr.openingBalance,
      closingBalance: curr.openingBalance + curr.savings + curr.exchangeNet + curr.peopleNet,
      transactionCount: curr.transactionCount,
      incomeCount: curr.incomeCount, expenseCount: curr.expenseCount, exchangeCount: curr.exchangeCount,
      giveCount: curr.giveCount, takeCount: curr.takeCount,
      avgIncome: curr.incomeCount > 0 ? curr.income / curr.incomeCount : 0,
      avgExpense: curr.expenseCount > 0 ? curr.expense / curr.expenseCount : 0,
      avgTransaction,
      dailyAverage,
      largestExpense: curr.largestExpense,
      expenseByCategory: buildBreakdown(curr.expenseRows, curr.expense),
      incomeByCategory: buildBreakdown(curr.incomeRows, curr.income),
      personBreakdown: buildPersonBreakdown(curr.personRows),
      incomeTrend, expenseTrend, savingsTrend,
      months,
    }
  }, [transactions, range, defaultCurrency, rates])

  return { data, loading, refresh }
}
