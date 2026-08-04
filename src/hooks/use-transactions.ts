'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '@/lib/appwrite/collections'
import { useAuth } from '@/providers/auth-provider'
import { useCategories } from './use-categories'
import type { Transaction, TransactionType } from '@/lib/types'

const PAGE_SIZE = 20

export interface TransactionQuery {
  type?: TransactionType
  currency?: string
  accountId?: string
  search?: string
}

export function useTransactions(query: TransactionQuery = {}) {
  const { user } = useAuth()
  const { categories } = useCategories()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const offsetRef = useRef(0)
  const seqRef = useRef(0)

  const { type, currency, accountId } = query
  const searchTerm = query.search?.trim()

  const fetchPage = useCallback(
    async (offset: number, replace: boolean) => {
      if (!user) return false
      const seq = ++seqRef.current
      try {
        let docs: Transaction[] = []
        let hasMore = false

        if (searchTerm) {
          const matchedCategoryIds = categories
            .filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((c) => c.$id)

          const [searchRes, catRes] = await Promise.all([
            listTransactions({
              userId: user.$id,
              type,
              currency,
              accountId,
              search: searchTerm,
              limit: PAGE_SIZE,
              offset: replace ? 0 : offset,
            }),
            replace && matchedCategoryIds.length
              ? listTransactions({
                  userId: user.$id,
                  type,
                  currency,
                  accountId,
                  categoryIds: matchedCategoryIds,
                  limit: 100,
                })
              : Promise.resolve({ documents: [] as Transaction[], total: 0 }),
          ])
          if (seq !== seqRef.current) return false

          const combined = new Map<string, Transaction>()
          for (const t of catRes.documents) combined.set(t.$id, t)
          for (const t of searchRes.documents) combined.set(t.$id, t)
          docs = Array.from(combined.values()).sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )
          hasMore = offset + searchRes.documents.length < searchRes.total
          setTotal(searchRes.total)
        } else {
          const res = await listTransactions({
            userId: user.$id,
            type,
            currency,
            accountId,
            limit: PAGE_SIZE,
            offset,
          })
          if (seq !== seqRef.current) return false
          docs = res.documents
          setTotal(res.total)
          hasMore = offset + res.documents.length < res.total
        }

        if (seq !== seqRef.current) return false

        if (replace) {
          setTransactions(docs)
          offsetRef.current = offset
        } else {
          setTransactions((prev) => {
            const seen = new Set(prev.map((t) => t.$id))
            return [...prev, ...docs.filter((t) => !seen.has(t.$id))]
          })
          offsetRef.current = offset
        }
        setError(null)
        return hasMore
      } catch (e) {
        if (seq !== seqRef.current) return false
        setError(e instanceof Error ? e.message : 'Failed to load transactions')
        return false
      }
    },
    [user, categories, type, currency, accountId, searchTerm]
  )

  const loadMore = useCallback(async () => {
    setLoadingMore(true)
    await fetchPage(offsetRef.current + PAGE_SIZE, false)
    setLoadingMore(false)
  }, [fetchPage])

  useEffect(() => {
    let ignore = false
    offsetRef.current = 0
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetchPage(0, true)
      .catch(() => undefined)
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [fetchPage])

  const hasMore = total > transactions.length

  const add = useCallback(
    async (data: {
      accountId: string
      type: TransactionType
      amount: number
      currency: string
      categoryId: string
      payee?: string
      note?: string
      date: string
      fromAccountId?: string
      toAccountId?: string
      fromAmount?: number
      toAmount?: number
      personId?: string
    }) => {
      if (!user) throw new Error('Not authenticated')
      const created = await createTransaction({ userId: user.$id, ...data })
      setTransactions((prev) => [created, ...prev])
      return created
    },
    [user]
  )

  const update = useCallback(
    async (
      transactionId: string,
      data: Partial<{
        accountId: string
        type: TransactionType
        amount: number
        currency: string
        categoryId: string
        payee: string
        note: string
        date: string
        fromAccountId: string
        toAccountId: string
        fromAmount: number
        toAmount: number
        personId: string
      }>
    ) => {
      const updated = await updateTransaction(transactionId, data)
      setTransactions((prev) => prev.map((t) => (t.$id === transactionId ? updated : t)))
      return updated
    },
    []
  )

  const remove = useCallback(async (transactionId: string) => {
    await deleteTransaction(transactionId)
    setTransactions((prev) => prev.filter((t) => t.$id !== transactionId))
  }, [])

  return {
    transactions,
    total,
    loading,
    loadingMore,
    error,
    loadMore,
    hasMore,
    add,
    update,
    remove,
    refresh: () => fetchPage(0, true),
  }
}
