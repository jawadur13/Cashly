'use client'

import { useEffect, useState } from 'react'
import { RATES_RELATIVE_TO_BDT, type CurrencyCode } from '@/lib/currency/currencies'

const API_URL = 'https://open.er-api.com/v6/latest/BDT'
const CACHE_KEY = 'cashly-exchange-rates'
const CACHE_TTL = 60 * 60 * 1000

interface ExchangeRatesState {
  rates: Record<CurrencyCode, number>
  loading: boolean
  error: string | null
  lastUpdated: number | null
}

export function useExchangeRates() {
  const [state, setState] = useState<ExchangeRatesState>({
    rates: { ...RATES_RELATIVE_TO_BDT },
    loading: false,
    error: null,
    lastUpdated: null,
  })

  const fetchRates = async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const res = await fetch(API_URL)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.result !== 'success') throw new Error('API returned failure')

      const apiRates: Record<string, number> = data.rates || {}
      const merged: Record<CurrencyCode, number> = { ...RATES_RELATIVE_TO_BDT }

      for (const code of Object.keys(apiRates) as CurrencyCode[]) {
        const rate = apiRates[code]
        if (rate && rate > 0) {
          merged[code] = 1 / rate
        }
      }

      const now = Date.now()
      const payload = JSON.stringify({ rates: merged, lastUpdated: now })
      if (typeof window !== 'undefined') {
        localStorage.setItem(CACHE_KEY, payload)
      }

      setState({ rates: merged, loading: false, error: null, lastUpdated: now })
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch exchange rates',
      }))
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        const age = Date.now() - (parsed.lastUpdated ?? 0)
        if (age < CACHE_TTL && parsed.rates) {
          setState((prev) => ({ ...prev, rates: parsed.rates, lastUpdated: parsed.lastUpdated }))
          return
        }
      }
    } catch {
      // ignore cache errors
    }

    fetchRates()
  }, [])

  return { ...state, refresh: fetchRates }
}
