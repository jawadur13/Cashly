'use client'

import { useMemo } from 'react'
import { accountBalances } from '@/lib/calculations'
import { convertCurrency } from '@/lib/currency/currencies'
import { useAllTransactions } from '@/providers/all-transactions-provider'
import { useAccounts } from './use-accounts'
import { useExchangeRates } from './use-exchange-rates'

export function useAccountBalances(defaultCurrency?: string) {
  const { accounts, loading: accountsLoading } = useAccounts()
  const { transactions, loading, refresh } = useAllTransactions()
  const { rates } = useExchangeRates()

  const balances = useMemo(() => accountBalances(transactions), [transactions])

  const total = useMemo(
    () =>
      accounts.reduce((sum, a) => {
        const balance = balances[a.$id] ?? 0
        if (defaultCurrency && defaultCurrency !== a.currency) {
          return sum + convertCurrency(balance, a.currency, defaultCurrency, rates)
        }
        return sum + balance
      }, 0),
    [accounts, balances, defaultCurrency, rates]
  )

  return { balances, total, loading: loading || accountsLoading, refresh }
}
