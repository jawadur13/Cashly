'use client'

import { useCallback, useEffect, useState } from 'react'
import { listTransactions } from '@/lib/appwrite/collections'
import { useAuth } from '@/providers/auth-provider'

export interface MonthlyStats {
  income: number
  expense: number
}

export function useMonthlySummary() {
  const { user } = useAuth()
  const [stats, setStats] = useState<MonthlyStats>({ income: 0, expense: 0 })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setStats({ income: 0, expense: 0 })
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
      for (const t of res.documents) {
        if (t.type === 'income') income += t.amount
        else expense += t.amount
      }
      setStats({ income, expense })
    } catch {
      setStats({ income: 0, expense: 0 })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  return { stats, loading, refresh }
}
