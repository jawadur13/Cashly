'use client'

import { AuthProvider } from './auth-provider'
import { SettingsProvider } from './settings-provider'
import { ThemeProvider } from './theme-provider'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>{children}</SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
