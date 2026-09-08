'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { listTransactions } from '@/lib/appwrite/collections'
import { useAuth } from './auth-provider'
import type { Transaction } from '@/lib/types'

/**
 * One shared copy of the signed-in user's full transaction history.
 *
 * The account balances, summary and people hooks each need every transaction,
 * and each used to page through the whole collection separately — three full
 * downloads, two of them running at once on the Home screen. They now share
 * this one.
 *
 * Anything that writes a transaction must call `refresh`, or the derived
 * balances will keep showing the pre-write numbers.
 */
interface AllTransactionsValue {
  transactions: Transaction[]
  loading: boolean
  /** Non-null when the history could not be loaded. Balances derived from a
   *  failed load would read as a confident zero, so callers must show this. */
  error: string | null
  refresh: () => Promise<void>
}

const AllTransactionsContext = createContext<AllTransactionsValue | undefined>(undefined)

export function AllTransactionsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Guards against an earlier, slower fetch overwriting a later one.
  const seqRef = useRef(0)

  const refresh = useCallback(async () => {
    const seq = ++seqRef.current
    if (!user) {
      setTransactions([])
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const PAGE_SIZE = 500
      let all: Transaction[] = []
      let offset = 0
      let total = 0
      do {
        const res = await listTransactions({ userId: user.$id, limit: PAGE_SIZE, offset })
        if (seqRef.current !== seq) return
        all = all.concat(res.documents)
        total = res.total
        offset += res.documents.length
        if (res.documents.length === 0) break
      } while (offset < total)
      if (seqRef.current === seq) setTransactions(all)
    } catch (e) {
      if (seqRef.current === seq) {
        setTransactions([])
        setError(e instanceof Error ? e.message : 'Failed to load transactions')
      }
    } finally {
      if (seqRef.current === seq) setLoading(false)
    }
  }, [user])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  return (
    <AllTransactionsContext.Provider value={{ transactions, loading, error, refresh }}>
      {children}
    </AllTransactionsContext.Provider>
  )
}

export function useAllTransactions() {
  const ctx = useContext(AllTransactionsContext)
  if (!ctx) throw new Error('useAllTransactions must be used within AllTransactionsProvider')
  return ctx
}
