'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Download, Info, Link2, LogOut, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Sheet } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { PageHeader } from '@/components/ui/page-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { IconTile, ListGroup, ListRow, SectionHeader } from '@/components/ui/list'
import { initials } from '@/components/nav/nav-config'
import { useTheme, type Theme } from '@/providers/theme-provider'
import { useSettings } from '@/providers/settings-provider'
import { useAuth } from '@/providers/auth-provider'
import { useToast } from '@/providers/toast-provider'
import { useAllTransactions } from '@/providers/all-transactions-provider'
import { useBalanceVisibility } from '@/providers/balance-visibility-provider'
import { useAccounts } from '@/hooks/use-accounts'
import { useCategories } from '@/hooks/use-categories'
import { usePeople } from '@/hooks/use-people'
import { deleteUserData } from '@/lib/supabase/data'
import { supabase } from '@/lib/supabase/client'
import { CURRENCIES } from '@/lib/currency/currencies'
import { sortNewestFirst } from '@/lib/activity'
import { transactionsToCsv } from '@/lib/export'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { defaultCurrency, setDefaultCurrency } = useSettings()
  const { user, refresh, signOut } = useAuth()
  const { transactions, refresh: refreshAll } = useAllTransactions()
  const { hideOnOpen, setHideOnOpen } = useBalanceVisibility()
  const { accounts } = useAccounts()
  const { categories } = useCategories()
  const { people } = usePeople()
  const { toast } = useToast()
  const router = useRouter()
  const [savingCurrency, setSavingCurrency] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [name, setName] = useState(user?.name ?? '')
  const [savingName, setSavingName] = useState(false)

  const sharedCount = people.filter((p) => p.shareToken).length

  async function handleDeleteAccount() {
    if (!user || deleteText.trim().toUpperCase() !== 'DELETE') return
    setDeletingAccount(true)
    try {
      await deleteUserData(user.$id)
      // The shared history would otherwise keep showing what was just deleted.
      await refreshAll()
      setDeleteConfirm(false)
      toast('All your data has been deleted', 'success')
      await signOut()
      router.replace('/auth/login')
    } catch {
      toast("Couldn't delete your data. Nothing was signed out — please try again.", 'error')
    } finally {
      setDeletingAccount(false)
    }
  }

  async function handleCurrency(code: string) {
    setSavingCurrency(true)
    try {
      await setDefaultCurrency(code as Parameters<typeof setDefaultCurrency>[0])
      toast(`Totals now shown in ${code}`, 'success')
    } catch {
      toast("Couldn't change the currency. Please try again.", 'error')
    } finally {
      setSavingCurrency(false)
    }
  }

  async function handleUpdateName() {
    if (!user || !name.trim() || name.trim() === user.name) return
    setSavingName(true)
    try {
      const { error } = await supabase.from('profiles').update({ name: name.trim() }).eq('id', user.$id)
      if (error) throw error
      await refresh()
      toast('Name updated', 'success')
    } catch {
      toast("Couldn't update your name. Please try again.", 'error')
    } finally {
      setSavingName(false)
    }
  }

  function exportCsv() {
    const accountMap = new Map(accounts.map((a) => [a.$id, a.name]))
    const categoryMap = new Map(categories.map((c) => [c.$id, c.name]))
    const personMap = new Map(people.map((p) => [p.$id, p.name]))
    const csv = transactionsToCsv(sortNewestFirst(transactions), {
      accountName: (id) => (id ? accountMap.get(id) ?? '' : ''),
      categoryName: (id) => categoryMap.get(id) ?? 'Uncategorized',
      personName: (id) => (id ? personMap.get(id) ?? '' : ''),
    })
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `cashly-transactions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast(`Exported ${transactions.length} transactions`, 'success')
  }

  const nameChanged = name.trim() !== '' && name.trim() !== (user?.name ?? '')

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <PageHeader title="Settings" />

      <section aria-label="Profile" className="flex items-center gap-4 rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-sm)] ring-1 ring-border">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-on-primary gold-hairline">
          {initials(user?.name, user?.email)}
        </span>
        <div className="min-w-0 flex-1">
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void handleUpdateName()
            }}
          >
            <Input name="name" label="Display name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            {nameChanged && (
              <Button type="submit" loading={savingName} className="shrink-0">
                Save
              </Button>
            )}
          </form>
          <p className="mt-1.5 truncate text-sm text-text-tertiary">{user?.email}</p>
        </div>
      </section>

      <section aria-label="Preferences" className="space-y-3">
        <SectionHeader title="Preferences" />
        <div className="space-y-4 rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-sm)] ring-1 ring-border">
          <div>
            <p className="mb-2 text-sm font-medium text-text-secondary">Appearance</p>
            <SegmentedControl<Theme>
              label="Appearance"
              value={theme}
              onChange={setTheme}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'Match device' },
              ]}
            />
          </div>
          <Select
            name="currency"
            label="Show totals in"
            hint="Balances in other currencies are converted at live rates."
            value={defaultCurrency}
            disabled={savingCurrency}
            onChange={(e) => handleCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </Select>
        </div>
        <ListGroup>
          <Switch
            checked={hideOnOpen}
            onChange={setHideOnOpen}
            label="Hide balances when Cashly opens"
            description="Tap the eye on Home to show them for the visit."
          />
        </ListGroup>
      </section>

      <section aria-label="Your data">
        <SectionHeader title="Your data" />
        <ListGroup>
          <ListRow
            onClick={exportCsv}
            leading={<IconTile><Download /></IconTile>}
            title="Export transactions"
            subtitle={`${transactions.length} transactions as a CSV file`}
          />
          <ListRow
            href="/app/people"
            leading={<IconTile><Link2 /></IconTile>}
            title="Share links"
            subtitle={sharedCount ? `${sharedCount} active — manage them on each person` : 'None active'}
          />
        </ListGroup>
      </section>

      <section aria-label="Account">
        <SectionHeader title="Account" />
        <ListGroup>
          <ListRow
            onClick={async () => {
              await signOut()
              router.replace('/auth/login')
            }}
            leading={<IconTile><LogOut /></IconTile>}
            title="Sign out"
          />
          <ListRow
            leading={<IconTile><Info /></IconTile>}
            title="Cashly"
            trailing={<span className="text-sm font-normal text-text-tertiary">Version {process.env.NEXT_PUBLIC_APP_VERSION}</span>}
          />
        </ListGroup>
      </section>

      <section aria-label="Danger zone" className="rounded-[var(--radius-lg)] bg-surface p-5 ring-1 ring-expense/25">
        <div className="flex items-center gap-2 text-sm font-semibold text-expense">
          <AlertTriangle className="size-4" aria-hidden /> Danger zone
        </div>
        <p className="mt-1.5 text-sm text-text-secondary">
          Permanently delete your transactions, accounts, categories, people and share links. Your login stays.
        </p>
        <Button variant="danger" fullWidth className="mt-4" onClick={() => setDeleteConfirm(true)}>
          <Trash2 className="size-4" /> Delete all my data
        </Button>
      </section>

      <Sheet open={deleteConfirm} onClose={() => { setDeleteConfirm(false); setDeleteText('') }} title="Delete all your data?">
        <p className="mb-2 text-sm text-text-secondary">This permanently deletes:</p>
        <ul className="mb-4 list-disc space-y-0.5 pl-5 text-sm text-text-secondary">
          <li>all {transactions.length} of your transactions</li>
          <li>your accounts and custom categories</li>
          <li>your people and their share links</li>
        </ul>
        <p className="mb-4 text-sm text-text-secondary">
          It can&apos;t be undone. Consider exporting first. You&apos;ll be signed out afterwards.
        </p>
        <Input
          name="confirmDelete"
          label="Type DELETE to confirm"
          autoComplete="off"
          autoCapitalize="characters"
          value={deleteText}
          onChange={(e) => setDeleteText(e.target.value)}
        />
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" fullWidth onClick={() => { setDeleteConfirm(false); setDeleteText('') }}>
            Cancel
          </Button>
          <Button
            variant="danger"
            fullWidth
            loading={deletingAccount}
            disabled={deleteText.trim().toUpperCase() !== 'DELETE'}
            onClick={handleDeleteAccount}
          >
            Delete everything
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
