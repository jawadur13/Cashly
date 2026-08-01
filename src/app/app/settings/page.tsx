'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Moon, Sun, Monitor, Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useTheme } from '@/providers/theme-provider'
import { useSettings } from '@/providers/settings-provider'
import { useAuth } from '@/providers/auth-provider'
import { useToast } from '@/providers/toast-provider'
import { CURRENCIES } from '@/lib/currency/currencies'
import { cn } from '@/lib/utils'
import type { Theme } from '@/providers/theme-provider'

const THEME_OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
]

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { defaultCurrency, setDefaultCurrency } = useSettings()
  const { user, signOut } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [savingCurrency, setSavingCurrency] = useState(false)

  async function handleCurrency(code: string) {
    setSavingCurrency(true)
    try {
      await setDefaultCurrency(code as Parameters<typeof setDefaultCurrency>[0])
      toast('Default currency updated', 'success')
    } finally {
      setSavingCurrency(false)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    router.replace('/auth/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary">Appearance, currency and account</p>
      </div>

      <section className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Sun className="size-4" /> Appearance
        </div>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              aria-pressed={theme === value}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-[var(--radius-md)] border px-2 py-3 text-xs font-medium transition-colors',
                theme === value
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-border bg-surface text-text-secondary hover:bg-surface-hover'
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Languages className="size-4" /> Default currency
        </div>
        <Select
          name="currency"
          label="Used for balances and reports"
          value={defaultCurrency}
          disabled={savingCurrency}
          onChange={(e) => handleCurrency(e.target.value)}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.code} â€” {c.name}</option>
          ))}
        </Select>
      </section>

      <section className="space-y-3 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
        <div>
          <p className="text-sm font-semibold text-text-primary">Account</p>
          <p className="text-sm text-text-secondary">{user?.email}</p>
        </div>
        <Button variant="danger" fullWidth loading={signingOut} onClick={handleSignOut}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </section>

      <p className="text-center text-xs text-text-tertiary">Cashly v1.0.0</p>
    </div>
  )
}
