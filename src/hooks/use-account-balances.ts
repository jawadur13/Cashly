'use client'

import { useCallback, useEffect, useState } from 'react'
import { listTransactions } from '@/lib/appwrite/collections'
import { useAuth } from '@/providers/auth-provider'
import { useAccounts } from './use-accounts'

export function useAccountBalances() {
  const { user } = useAuth()
  const { accounts, loading: accountsLoading } = useAccounts()
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setBalances({})
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await listTransactions({ userId: user.$id, limit: 500 })
      const map: Record<string, number> = {}
      for (const t of res.documents) {
        map[t.accountId] = (map[t.accountId] ?? 0) + (t.type === 'income' ? t.amount : -t.amount)
      }
      setBalances(map)
    } catch {
      setBalances({})
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  const total = accounts.reduce((sum, a) => sum + (balances[a.$id] ?? 0), 0)

  return { balances, total, loading: loading || accountsLoading, refresh }
}
