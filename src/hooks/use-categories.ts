'use client'

import { createContext, createElement, useCallback, useContext, useEffect, useState } from 'react'
import { listCategories, createCategory, deleteCategory } from '@/lib/supabase/data'
import { useAuth } from '@/providers/auth-provider'
import type { Category, TransactionType } from '@/lib/types'

function useCategoriesState() {
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

type CategoriesValue = ReturnType<typeof useCategoriesState>
const CategoriesContext = createContext<CategoriesValue | null>(null)

/**
 * One shared copy of the signed-in user's categories, loaded once for the whole
 * app. Every screen used to fetch its own on mount, so each tab switch
 * refetched and flashed skeletons.
 */
export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  return createElement(CategoriesContext.Provider, { value: useCategoriesState() }, children)
}

export function useCategories(): CategoriesValue {
  const ctx = useContext(CategoriesContext)
  if (!ctx) throw new Error('useCategories must be used within CategoriesProvider')
  return ctx
}
