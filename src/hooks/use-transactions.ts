'use client'

import { useCallback } from 'react'
import { createTransaction, updateTransaction, deleteTransaction } from '@/lib/supabase/data'
import { readAmountMinor, readFromAmountMinor, readToAmountMinor } from '@/lib/money'
import { useAllTransactions } from '@/providers/all-transactions-provider'
import { useAuth } from '@/providers/auth-provider'
import type { Transaction, TransactionType } from '@/lib/types'

export interface TransactionInput {
  accountId: string
  type: TransactionType
  /** Whole minor units (paisa). */
  amountMinor: number
  currency: string
  categoryId: string
  payee?: string
  note?: string
  date: string
  fromAccountId?: string
  toAccountId?: string
  fromAmountMinor?: number
  toAmountMinor?: number
  personId?: string
}

/**
 * Writes to transactions. Each one updates the shared history immediately (so
 * every balance on screen moves at once) and then refreshes it from the server
 * in the background — the AGENTS.md rule that every write calls `refresh`.
 */
export function useTransactionActions() {
  const { user } = useAuth()
  const { refresh, upsertLocal, removeLocal } = useAllTransactions()

  const add = useCallback(
    async (data: TransactionInput) => {
      if (!user) throw new Error('Not authenticated')
      const created = await createTransaction({ userId: user.$id, ...data })
      upsertLocal(created)
      void refresh()
      return created
    },
    [user, upsertLocal, refresh]
  )

  const update = useCallback(
    async (transactionId: string, data: Partial<TransactionInput>) => {
      const updated = await updateTransaction(transactionId, data)
      upsertLocal(updated)
      void refresh()
      return updated
    },
    [upsertLocal, refresh]
  )

  /** Removes it from screen first; puts it back if the server refuses. */
  const remove = useCallback(
    async (transaction: Transaction) => {
      removeLocal(transaction.$id)
      try {
        await deleteTransaction(transaction.$id)
      } catch (e) {
        upsertLocal(transaction)
        throw e
      }
      void refresh()
    },
    [removeLocal, upsertLocal, refresh]
  )

  /** Undo for a delete: records the same transaction again. */
  const restore = useCallback(
    (t: Transaction) =>
      add({
        accountId: t.accountId,
        type: t.type,
        amountMinor: readAmountMinor(t),
        currency: t.currency,
        categoryId: t.categoryId,
        payee: t.payee,
        note: t.note,
        date: t.date,
        personId: t.personId,
        ...(t.type === 'exchange'
          ? {
              fromAccountId: t.fromAccountId,
              toAccountId: t.toAccountId,
              fromAmountMinor: readFromAmountMinor(t),
              toAmountMinor: readToAmountMinor(t),
            }
          : {}),
      }),
    [add]
  )

  return { add, update, remove, restore }
}
