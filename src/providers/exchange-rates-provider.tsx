'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { RATES_RELATIVE_TO_BDT, type CurrencyCode } from '@/lib/currency/currencies'

const API_URL = 'https://open.er-api.com/v6/latest/BDT'
const CACHE_KEY = 'cashly-exchange-rates'
const CACHE_TTL = 60 * 60 * 1000

interface ExchangeRatesContextValue {
  rates: Record<CurrencyCode, number>
  loading: boolean
  error: string | null
  lastUpdated: number | null
  refresh: () => void
}

const ExchangeRatesContext = createContext<ExchangeRatesContextValue | undefined>(undefined)

export function ExchangeRatesProvider({ children }: { children: React.ReactNode }) {
  const [rates, setRates] = useState<Record<CurrencyCode, number>>({ ...RATES_RELATIVE_TO_BDT })
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(API_URL)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.result !== 'success') throw new Error('API returned failure')

      const apiRates: Record<string, number> = data.rates || {}
      // Every supported currency always resolves to either a fresh API rate
      // or the hardcoded seed — no need to read current state here, which
      // keeps this update pure (no refs touched during render).
      const merged: Record<CurrencyCode, number> = { ...RATES_RELATIVE_TO_BDT }
      for (const code of Object.keys(apiRates) as CurrencyCode[]) {
        const rate = apiRates[code]
        if (rate && rate > 0) merged[code] = 1 / rate
      }

      const now = Date.now()
      if (typeof window !== 'undefined') {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: merged, lastUpdated: now }))
      }
      setRates(merged)
      setLastUpdated(now)
    } catch (err) {
      // Keep whatever rates are already in state (cache, or the previous
      // successful fetch) — a failed refresh should never regress back to
      // the hardcoded seed values.
      setError(err instanceof Error ? err.message : 'Failed to fetch exchange rates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    let cachedAge = Infinity
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed?.rates && parsed?.lastUpdated) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setRates(parsed.rates)
          setLastUpdated(parsed.lastUpdated)
          cachedAge = Date.now() - parsed.lastUpdated
        }
      }
    } catch {
      // ignore cache errors
    }

    // Stale-while-revalidate: cached rates (even expired ones) are already
    // applied above, which is strictly better than the hardcoded seed while
    // a fresh fetch is in flight.
    if (cachedAge >= CACHE_TTL) fetchRates()

    const interval = setInterval(fetchRates, CACHE_TTL)
    return () => clearInterval(interval)
  }, [fetchRates])

  return (
    <ExchangeRatesContext.Provider value={{ rates, loading, error, lastUpdated, refresh: fetchRates }}>
      {children}
    </ExchangeRatesContext.Provider>
  )
}

export function useExchangeRates() {
  const ctx = useContext(ExchangeRatesContext)
  if (!ctx) throw new Error('useExchangeRates must be used within ExchangeRatesProvider')
  return ctx
}
