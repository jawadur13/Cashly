'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

interface BalanceVisibilityContextValue {
  hidden: boolean
  reveal: () => void
}

const BalanceVisibilityContext = createContext<BalanceVisibilityContextValue | undefined>(undefined)
const REVEAL_DURATION = 5000

export function BalanceVisibilityProvider({ children }: { children: React.ReactNode }) {
  // Balances are hidden by default so amounts are never shown accidentally.
  const [revealed, setRevealed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reveal = useCallback(() => {
    setRevealed(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setRevealed(false), REVEAL_DURATION)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <BalanceVisibilityContext.Provider value={{ hidden: !revealed, reveal }}>
      {children}
    </BalanceVisibilityContext.Provider>
  )
}

export function useBalanceVisibility() {
  const ctx = useContext(BalanceVisibilityContext)
  if (!ctx) throw new Error('useBalanceVisibility must be used within BalanceVisibilityProvider')
  return ctx
}
