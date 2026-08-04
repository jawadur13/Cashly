'use client'

import { useCallback, useEffect, useState } from 'react'
import { listTransactions } from '@/lib/appwrite/collections'
import { convertCurrency } from '@/lib/currency/currencies'
import { useAuth } from '@/providers/auth-provider'
import { useSettings } from '@/providers/settings-provider'
import { useExchangeRates } from './use-exchange-rates'

export interface MonthlyStats {
  income: number
  expense: number
  exchange: number
}

export function useMonthlySummary() {
  const { user } = useAuth()
  const { defaultCurrency } = useSettings()
  const { rates } = useExchangeRates()
  const [stats, setStats] = useState<MonthlyStats>({ income: 0, expense: 0, exchange: 0 })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setStats({ income: 0, expense: 0, exchange: 0 })
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const now = new Date()
      const from = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString()
      const res = await listTransactions({
        userId: user.$id,
        from,
        limit: 500,
      })
      let income = 0
      let expense = 0
      let exchange = 0
      for (const t of res.documents) {
        const normalized = convertCurrency(t.amount, t.currency, defaultCurrency, rates)
        if (t.type === 'income') income += normalized
        else if (t.type === 'expense') expense += normalized
        else if (t.type === 'exchange') {
          const diff = Math.abs((t.fromAmount ?? 0) - (t.toAmount ?? 0))
          exchange += convertCurrency(diff, t.currency, defaultCurrency, rates)
        }
      }
      setStats({ income, expense, exchange })
    } catch {
      setStats({ income: 0, expense: 0, exchange: 0 })
    } finally {
      setLoading(false)
    }
  }, [user, defaultCurrency, rates])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  return { stats, loading, refresh }
}
