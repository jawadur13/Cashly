'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { listPeople, createPerson, updatePerson, deletePerson } from '@/lib/appwrite/collections'
import { peopleBalances } from '@/lib/calculations'
import { convertMinor } from '@/lib/currency/currencies'
import { useAllTransactions } from '@/providers/all-transactions-provider'
import { useAuth } from '@/providers/auth-provider'
import { useSettings } from '@/providers/settings-provider'
import { useExchangeRates } from './use-exchange-rates'
import type { Person } from '@/lib/types'

export interface PersonWithBalance extends Person {
  balance: number
  status: 'they-owe' | 'you-owe' | 'settled'
}

export function usePeople() {
  const { user } = useAuth()
  const { defaultCurrency } = useSettings()
  const { rates } = useExchangeRates()
  const { transactions, loading: txLoading, error: txError } = useAllTransactions()
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)

  const balances = useMemo(
    () => peopleBalances(transactions, (amount, currency) =>
      convertMinor(amount, currency, defaultCurrency, rates)
    ),
    [transactions, defaultCurrency, rates]
  )
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setPeople([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setPeople(await listPeople(user.$id))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load people')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  const add = useCallback(
    async (data: { name: string; note?: string }) => {
      if (!user) throw new Error('Not authenticated')
      const created = await createPerson({ userId: user.$id, ...data })
      setPeople((prev) => [...prev, created])
      return created
    },
    [user]
  )

  const update = useCallback(
    async (personId: string, data: { name?: string; note?: string }) => {
      const updated = await updatePerson(personId, data)
      setPeople((prev) => prev.map((p) => (p.$id === personId ? updated : p)))
      return updated
    },
    []
  )

  const remove = useCallback(async (personId: string) => {
    await deletePerson(personId)
    setPeople((prev) => prev.filter((p) => p.$id !== personId))
  }, [])

  const enriched = useMemo<PersonWithBalance[]>(() =>
    people.map((p) => {
      const balance = balances[p.$id] ?? 0
      return {
        ...p,
        balance,
        status: balance > 0 ? 'you-owe' : balance < 0 ? 'they-owe' : 'settled',
      }
    }),
    [people, balances]
  )

  return { people: enriched, loading: loading || txLoading, error: error ?? txError, refresh, add, update, remove }
}
