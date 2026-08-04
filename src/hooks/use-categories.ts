'use client'

import { useCallback, useEffect, useState } from 'react'
import { listCategories, createCategory, deleteCategory } from '@/lib/appwrite/collections'
import { useAuth } from '@/providers/auth-provider'
import type { Category, TransactionType } from '@/lib/types'

export function useCategories() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setCategories([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await listCategories(user.$id)
      setCategories(res)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  const add = useCallback(
    async (data: { type: TransactionType; name: string; icon: string }) => {
      if (!user) throw new Error('Not authenticated')
      const created = await createCategory({ userId: user.$id, ...data })
      setCategories((prev) => [...prev, created])
      return created
    },
    [user]
  )

  const remove = useCallback(async (categoryId: string) => {
    await deleteCategory(categoryId)
    setCategories((prev) => prev.filter((c) => c.$id !== categoryId))
  }, [])

  const byType = useCallback(
    (type: TransactionType) => categories.filter((c) => c.type === type),
    [categories]
  )

  return { categories, loading, error, refresh, add, remove, byType }
}
