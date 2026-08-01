'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { account } from '@/lib/appwrite/client'
import { DEFAULT_CURRENCY, getCurrency } from '@/lib/currency/currencies'
import type { CurrencyCode } from '@/lib/currency/currencies'
import { useAuth } from './auth-provider'

interface SettingsContextValue {
  defaultCurrency: string
  setDefaultCurrency: (code: CurrencyCode) => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth()
  const [defaultCurrency, setCurrency] = useState<string>(DEFAULT_CURRENCY)

  useEffect(() => {
    if (status === 'authenticated' && user?.prefs?.defaultCurrency) {
      const prefsCurrency = String(user.prefs.defaultCurrency)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrency(getCurrency(prefsCurrency).code)
    } else {
      setCurrency(DEFAULT_CURRENCY)
    }
  }, [user, status])

  const setDefaultCurrency = useCallback(async (code: CurrencyCode) => {
    await account.updatePrefs({ defaultCurrency: code })
    setCurrency(code)
  }, [])

  return (
    <SettingsContext.Provider value={{ defaultCurrency, setDefaultCurrency }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
