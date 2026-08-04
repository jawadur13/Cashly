'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { listPeople, createPerson, updatePerson, deletePerson, listTransactions } from '@/lib/appwrite/collections'
import { useAuth } from '@/providers/auth-provider'
import type { Person, Transaction, TransactionType } from '@/lib/types'

export interface PersonWithBalance extends Person {
  balance: number
  status: 'they-owe' | 'you-owe' | 'settled'
}

export function usePeople() {
  const { user } = useAuth()
  const [people, setPeople] = useState<Person[]>([])
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const computeBalances = useCallback(async (userId: string) => {
    const PAGE_SIZE = 500
    let allDocs: Transaction[] = []
    let offset = 0
    let total = 0
    do {
      const res = await listTransactions({ userId, type: 'give' as TransactionType, limit: PAGE_SIZE, offset })
      allDocs = allDocs.concat(res.documents)
      if (total === 0) total = res.total
      offset += res.documents.length
    } while (offset < total)

    offset = 0
    total = 0
    do {
      const res = await listTransactions({ userId, type: 'take' as TransactionType, limit: PAGE_SIZE, offset })
      allDocs = allDocs.concat(res.documents)
      if (total === 0) total = res.total
      offset += res.documents.length
    } while (offset < total)

    const map: Record<string, number> = {}
    for (const t of allDocs) {
      if (!t.personId) continue
      if (t.type === 'give') map[t.personId] = (map[t.personId] ?? 0) + t.amount
      if (t.type === 'take') map[t.personId] = (map[t.personId] ?? 0) - t.amount
    }
    return map
  }, [])

  const refresh = useCallback(async () => {
    if (!user) {
      setPeople([])
      setBalances({})
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [res, bals] = await Promise.all([
        listPeople(user.$id),
        computeBalances(user.$id),
      ])
      setPeople(res)
      setBalances(bals)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load people')
    } finally {
      setLoading(false)
    }
  }, [user, computeBalances])

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
        status: balance > 0 ? 'they-owe' : balance < 0 ? 'you-owe' : 'settled',
      }
    }),
    [people, balances]
  )

  return { people: enriched, loading, error, refresh, add, update, remove }
}
