'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Moon, Sun, Monitor, Languages, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Sheet } from '@/components/ui/sheet'
import { useTheme } from '@/providers/theme-provider'
import { useSettings } from '@/providers/settings-provider'
import { useAuth } from '@/providers/auth-provider'
import { useToast } from '@/providers/toast-provider'
import { deleteUserData } from '@/lib/appwrite/collections'
import { account } from '@/lib/appwrite/client'
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
  const { user, refresh } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [savingCurrency, setSavingCurrency] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [savingName, setSavingName] = useState(false)

  async function handleDeleteAccount() {
    if (!user) return
    setDeletingAccount(true)
    try {
      await deleteUserData(user.$id)
      toast('All your data has been deleted', 'success')
      setDeleteConfirm(false)
      router.replace('/auth/login')
    } catch {
      toast('Failed to delete account data. Please try again.', 'error')
    } finally {
      setDeletingAccount(false)
    }
  }

  async function handleCurrency(code: string) {
    setSavingCurrency(true)
    try {
      await setDefaultCurrency(code as Parameters<typeof setDefaultCurrency>[0])
      toast('Default currency updated', 'success')
    } finally {
      setSavingCurrency(false)
    }
  }

  async function handleUpdateName() {
    if (!name.trim() || name.trim() === user?.name) return
    setSavingName(true)
    try {
      await account.updateName(name.trim())
      await refresh()
      toast('Name updated', 'success')
    } catch {
      toast('Failed to update name. Please try again.', 'error')
    } finally {
      setSavingName(false)
    }
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
        <p className="text-sm font-semibold text-text-primary">Profile</p>
        <Input
          name="name"
          label="Display name"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button fullWidth loading={savingName} onClick={handleUpdateName} disabled={!name.trim() || name.trim() === (user?.name ?? '')}>
          Save name
        </Button>
        <p className="text-xs text-text-tertiary">{user?.email}</p>
      </section>

      <section className="rounded-[var(--radius-lg)] border border-expense/20 bg-surface p-5 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-2 text-sm font-semibold text-expense">
          <AlertTriangle className="size-4" /> Danger zone
        </div>
        <p className="mt-1 text-xs text-text-secondary">
          Permanently delete all your transactions, accounts, and categories. This action cannot be undone.
        </p>
        <Button
          variant="danger"
          fullWidth
          className="mt-3"
          onClick={() => setDeleteConfirm(true)}
        >
          <Trash2 className="size-4" /> Delete all my data
        </Button>
      </section>

      <Sheet open={deleteConfirm} onClose={() => setDeleteConfirm(false)} title="Delete all data">
        <p className="mb-1 text-sm text-text-secondary">
          This will permanently delete <span className="font-semibold text-text-primary">all</span> your transactions,
          accounts, and categories.
        </p>
        <p className="mb-4 text-sm text-text-secondary">
          This action cannot be undone. You will be signed out afterwards.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" fullWidth loading={deletingAccount} onClick={handleDeleteAccount}>
            Delete everything
          </Button>
        </div>
      </Sheet>

      <p className="text-center text-xs text-text-tertiary">Cashly v1.0.0</p>
    </div>
  )
}
