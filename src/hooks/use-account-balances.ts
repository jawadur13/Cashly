'use client'

import { useCallback, useEffect, useState } from 'react'
import { listTransactions } from '@/lib/appwrite/collections'
import { accountBalances } from '@/lib/calculations'
import { convertCurrency } from '@/lib/currency/currencies'
import { useAuth } from '@/providers/auth-provider'
import { useAccounts } from './use-accounts'
import { useExchangeRates } from './use-exchange-rates'

export function useAccountBalances(defaultCurrency?: string) {
  const { user } = useAuth()
  const { accounts, loading: accountsLoading } = useAccounts()
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const { rates } = useExchangeRates()

  const refresh = useCallback(async () => {
    if (!user) {
      setBalances({})
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const PAGE_SIZE = 500
      let allDocs: Awaited<ReturnType<typeof listTransactions>>['documents'] = []
      let offset = 0
      let total = 0
      do {
        const res = await listTransactions({ userId: user.$id, limit: PAGE_SIZE, offset })
        allDocs = allDocs.concat(res.documents)
        if (total === 0) total = res.total
        offset += res.documents.length
      } while (offset < total)

      setBalances(accountBalances(allDocs))
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

  const total = accounts.reduce((sum, a) => {
    const balance = balances[a.$id] ?? 0
    if (defaultCurrency && defaultCurrency !== a.currency) {
      return sum + convertCurrency(balance, a.currency, defaultCurrency, rates)
    }
    return sum + balance
  }, 0)

  return { balances, total, loading: loading || accountsLoading, refresh }
}
