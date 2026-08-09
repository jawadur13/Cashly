'use client'

import { AuthProvider } from './auth-provider'
import { ExchangeRatesProvider } from './exchange-rates-provider'
import { SettingsProvider } from './settings-provider'
import { ThemeProvider } from './theme-provider'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <ExchangeRatesProvider>{children}</ExchangeRatesProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
