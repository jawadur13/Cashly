'use client'

import { createContext, useCallback, useContext } from 'react'
import { useRouter } from 'next/navigation'
import type { TransactionType } from '@/lib/types'

export interface QuickAddPreset {
  type?: TransactionType
  accountId?: string
  personId?: string
}

interface QuickAddContextValue {
  open: (preset?: QuickAddPreset) => void
}

const QuickAddContext = createContext<QuickAddContextValue | undefined>(undefined)

/** The one "add transaction" entry point, so every + in the app behaves the same. */
export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const open = useCallback(
    (preset: QuickAddPreset = {}) => {
      const params = new URLSearchParams()
      if (preset.type) params.set('type', preset.type)
      if (preset.accountId) params.set('account', preset.accountId)
      if (preset.personId) params.set('person', preset.personId)
      const query = params.toString()
      router.push(`/app/transactions/new${query ? `?${query}` : ''}`)
    },
    [router]
  )
  return <QuickAddContext.Provider value={{ open }}>{children}</QuickAddContext.Provider>
}

export function useQuickAdd() {
  const ctx = useContext(QuickAddContext)
  if (!ctx) throw new Error('useQuickAdd must be used within QuickAddProvider')
  return ctx
}
