'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { account } from '@/lib/appwrite/client'
import { DEFAULT_CURRENCY, isSupportedCurrency } from '@/lib/currency/currencies'
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
      // A preference saved before the currency list was trimmed may name a
      // currency the app no longer has a rate for; fall back rather than
      // display every total in a currency that cannot be converted.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrency(isSupportedCurrency(prefsCurrency) ? prefsCurrency : DEFAULT_CURRENCY)
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
