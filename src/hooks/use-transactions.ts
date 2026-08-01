'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  listTransactions,
  searchTransactionsByNote,
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

  const { type, currency, accountId } = query
  const searchTerm = query.search?.trim()

  const fetchPage = useCallback(
    async (offset: number, replace: boolean) => {
      if (!user) return false
      try {
        let docs: Transaction[] = []
        let hasMore = false

        if (searchTerm) {
          const noteMatches = await searchTransactionsByNote(user.$id, searchTerm)
          const matchedCategoryIds = categories
            .filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((c) => c.$id)
          const res = await listTransactions({
            userId: user.$id,
            type,
            currency,
            accountId,
            categoryIds: matchedCategoryIds.length ? matchedCategoryIds : undefined,
            limit: 100,
          })
          const combined = new Map<string, Transaction>()
          for (const t of [...noteMatches, ...res.documents]) combined.set(t.$id, t)
          docs = Array.from(combined.values()).sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )
        } else {
          const res = await listTransactions({
            userId: user.$id,
            type,
            currency,
            accountId,
            limit: PAGE_SIZE,
            offset,
          })
          docs = res.documents
          setTotal(res.total)
          hasMore = offset + res.documents.length < res.total
        }

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
        setError(e instanceof Error ? e.message : 'Failed to load transactions')
        return false
      }
    },
    [user, categories, type, currency, accountId, searchTerm]
  )

  const loadMore = useCallback(async () => {
    if (searchTerm) return
    setLoadingMore(true)
    await fetchPage(offsetRef.current + PAGE_SIZE, false)
    setLoadingMore(false)
  }, [fetchPage, searchTerm])

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

  const hasMore = total > transactions.length && !searchTerm

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
