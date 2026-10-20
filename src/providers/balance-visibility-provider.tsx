'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

interface BalanceVisibilityContextValue {
  hidden: boolean
  reveal: () => void
  hide: () => void
  toggle: () => void
  /** Whether balances start hidden each time Cashly opens (a Settings preference). */
  hideOnOpen: boolean
  setHideOnOpen: (value: boolean) => void
}

const BalanceVisibilityContext = createContext<BalanceVisibilityContextValue | undefined>(undefined)

const PREF_KEY = 'cashly-hide-balances-on-open'
const SESSION_KEY = 'cashly-balances-revealed'

function read(storage: 'local' | 'session', key: string): string | null {
  try {
    return (storage === 'local' ? window.localStorage : window.sessionStorage).getItem(key)
  } catch {
    return null
  }
}

function write(storage: 'local' | 'session', key: string, value: string) {
  try {
    ;(storage === 'local' ? window.localStorage : window.sessionStorage).setItem(key, value)
  } catch {
    // Private mode: the choice lasts until the page closes.
  }
}

/**
 * Balances start hidden (unless the user turned that off) so amounts are never
 * shown by accident in public. Revealing lasts for the visit — it used to
 * re-hide after five seconds, which left the hero blurred nearly all the time.
 */
export function BalanceVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [hideOnOpen, setHideOnOpenState] = useState(true)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const pref = read('local', PREF_KEY) !== 'false'
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHideOnOpenState(pref)
    setRevealed(!pref || read('session', SESSION_KEY) === 'true')
  }, [])

  const setVisible = useCallback((visible: boolean) => {
    setRevealed(visible)
    write('session', SESSION_KEY, String(visible))
  }, [])

  const reveal = useCallback(() => setVisible(true), [setVisible])
  const hide = useCallback(() => setVisible(false), [setVisible])
  const toggle = useCallback(() => setRevealed((r) => {
    write('session', SESSION_KEY, String(!r))
    return !r
  }), [])

  const setHideOnOpen = useCallback((value: boolean) => {
    setHideOnOpenState(value)
    write('local', PREF_KEY, String(value))
  }, [])

  return (
    <BalanceVisibilityContext.Provider value={{ hidden: !revealed, reveal, hide, toggle, hideOnOpen, setHideOnOpen }}>
      {children}
    </BalanceVisibilityContext.Provider>
  )
}

export function useBalanceVisibility() {
  const ctx = useContext(BalanceVisibilityContext)
  if (!ctx) throw new Error('useBalanceVisibility must be used within BalanceVisibilityProvider')
  return ctx
}
