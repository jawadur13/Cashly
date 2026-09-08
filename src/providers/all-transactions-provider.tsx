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
  refresh: () => Promise<void>
}

const AllTransactionsContext = createContext<AllTransactionsValue | undefined>(undefined)

export function AllTransactionsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  // Guards against an earlier, slower fetch overwriting a later one.
  const seqRef = useRef(0)

  const refresh = useCallback(async () => {
    const seq = ++seqRef.current
    if (!user) {
      setTransactions([])
      setLoading(false)
      return
    }
    setLoading(true)
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
    } catch {
      if (seqRef.current === seq) setTransactions([])
    } finally {
      if (seqRef.current === seq) setLoading(false)
    }
  }, [user])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  return (
    <AllTransactionsContext.Provider value={{ transactions, loading, refresh }}>
      {children}
    </AllTransactionsContext.Provider>
  )
}

export function useAllTransactions() {
  const ctx = useContext(AllTransactionsContext)
  if (!ctx) throw new Error('useAllTransactions must be used within AllTransactionsProvider')
  return ctx
}
