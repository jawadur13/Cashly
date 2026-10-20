'use client'

import { AccountsProvider } from '@/hooks/use-accounts'
import { CategoriesProvider } from '@/hooks/use-categories'
import { PeopleProvider } from '@/hooks/use-people'
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
            <AllTransactionsProvider>
              <AccountsProvider>
                <CategoriesProvider>
                  <PeopleProvider>{children}</PeopleProvider>
                </CategoriesProvider>
              </AccountsProvider>
            </AllTransactionsProvider>
          </ExchangeRatesProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
