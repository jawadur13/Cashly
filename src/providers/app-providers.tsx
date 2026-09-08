'use client'

import { AllTransactionsProvider } from './all-transactions-provider'
import { AuthProvider } from './auth-provider'
import { ExchangeRatesProvider } from './exchange-rates-provider'
import { SettingsProvider } from './settings-provider'
import { ThemeProvider } from './theme-provider'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <ExchangeRatesProvider>
            <AllTransactionsProvider>{children}</AllTransactionsProvider>
          </ExchangeRatesProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
