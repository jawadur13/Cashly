'use client'

import { useCallback, useEffect, useState } from 'react'
import { listAccounts, createAccount, updateAccount, reassignAndDeleteAccount } from '@/lib/appwrite/collections'
import { useAuth } from '@/providers/auth-provider'
import type { Account, AccountType } from '@/lib/types'

export function useAccounts() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setAccounts([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await listAccounts(user.$id)
      setAccounts(res)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  const add = useCallback(
    async (data: { name: string; type: AccountType; currency: string }) => {
      if (!user) throw new Error('Not authenticated')
      const created = await createAccount({ userId: user.$id, ...data })
      setAccounts((prev) => [...prev, created])
      return created
    },
    [user]
  )

  const update = useCallback(
    async (accountId: string, data: { name?: string; type?: AccountType }) => {
      const updated = await updateAccount(accountId, data)
      setAccounts((prev) => prev.map((a) => (a.$id === accountId ? updated : a)))
      return updated
    },
    []
  )

  /**
   * Moves an account's transactions to another account, then removes it.
   * No transaction is ever deleted — see `reassignAndDeleteAccount`.
   */
  const removeAndReassign = useCallback(
    async (accountId: string, destinationAccountId: string) => {
      if (!user) throw new Error('Not authenticated')
      const result = await reassignAndDeleteAccount(user.$id, accountId, destinationAccountId)
      setAccounts((prev) => prev.filter((a) => a.$id !== accountId))
      return result
    },
    [user]
  )

  return { accounts, loading, error, refresh, add, update, removeAndReassign }
}
