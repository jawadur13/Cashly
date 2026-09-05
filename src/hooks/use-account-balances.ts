'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { listTransactions } from '@/lib/appwrite/collections'
import { signedCashDelta } from '@/lib/calculations'
import { convertCurrency } from '@/lib/currency/currencies'
import { useAuth } from '@/providers/auth-provider'
import { useAccounts } from './use-accounts'
import { useExchangeRates } from './use-exchange-rates'
import type { Transaction } from '@/lib/types'

export function useAccountBalances(defaultCurrency?: string) {
  const { user } = useAuth()
  const { accounts, loading: accountsLoading } = useAccounts()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const { rates } = useExchangeRates()

  const refresh = useCallback(async () => {
    if (!user) {
      setTransactions([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const PAGE_SIZE = 500
      let allDocs: Transaction[] = []
      let offset = 0
      let total = 0
      do {
        const res = await listTransactions({ userId: user.$id, limit: PAGE_SIZE, offset })
        // A page that comes back empty while offset < total would otherwise
        // stop advancing the offset and spin this loop forever.
        if (res.documents.length === 0) break
        allDocs = allDocs.concat(res.documents)
        if (total === 0) total = res.total
        offset += res.documents.length
      } while (offset < total)
      setTransactions(allDocs)
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

  const balances = useMemo(() => {
    const accountCurrency: Record<string, string> = {}
    for (const a of accounts) accountCurrency[a.$id] = a.currency

    const map: Record<string, number> = {}
    for (const t of transactions) {
      if (t.type === 'exchange') {
        // Each leg is already denominated in its own account's currency, so
        // both land in the right balance without conversion.
        if (t.fromAccountId) map[t.fromAccountId] = (map[t.fromAccountId] ?? 0) - (t.fromAmount ?? 0)
        if (t.toAccountId) map[t.toAccountId] = (map[t.toAccountId] ?? 0) + (t.toAmount ?? 0)
      } else {
        // A balance is held in its account's currency. A transaction may carry
        // a different one (edited after the fact, or the account's currency was
        // changed), so convert before adding rather than summing mixed units.
        const target = accountCurrency[t.accountId] ?? t.currency
        map[t.accountId] =
          (map[t.accountId] ?? 0) + convertCurrency(signedCashDelta(t), t.currency, target, rates)
      }
    }
    return map
  }, [transactions, accounts, rates])

  const total = accounts.reduce((sum, a) => {
    const balance = balances[a.$id] ?? 0
    if (defaultCurrency && defaultCurrency !== a.currency) {
      return sum + convertCurrency(balance, a.currency, defaultCurrency, rates)
    }
    return sum + balance
  }, 0)

  return { balances, total, loading: loading || accountsLoading, refresh }
}
