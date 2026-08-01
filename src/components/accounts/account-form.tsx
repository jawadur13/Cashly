'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { CURRENCIES } from '@/lib/currency/currencies'
import { useSettings } from '@/providers/settings-provider'
import type { Account, AccountType } from '@/lib/types'

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'mobile-wallet', label: 'Mobile Wallet' },
]

interface AccountFormProps {
  initial?: Account
  onSubmit: (values: { name: string; type: AccountType; currency: string }) => Promise<void>
  onCancel: () => void
  submitLabel: string
}

export function AccountForm({ initial, onSubmit, onCancel, submitLabel }: AccountFormProps) {
  const { defaultCurrency } = useSettings()
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<AccountType>(initial?.type ?? 'cash')
  const [currency, setCurrency] = useState(initial?.currency ?? defaultCurrency)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Enter an account name')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit({ name: name.trim(), type, currency })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save account')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Input
        name="name"
        label="Account name"
        placeholder="e.g. Cash, Bank, bKash"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error ?? undefined}
      />
      <div>
        <span className="mb-1.5 block text-[0.8125rem] font-medium text-text-secondary">Type</span>
        <div className="flex gap-2">
          {ACCOUNT_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              aria-pressed={type === t.value}
              className={
                type === t.value
                  ? 'flex-1 rounded-[var(--radius-md)] border border-accent bg-accent-soft px-3 py-2.5 text-sm font-medium text-accent'
                  : 'flex-1 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary'
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <Select name="currency" label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
        ))}
      </Select>
      <div className="flex gap-3 pt-1">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel}>Cancel</Button>
        <Button type="submit" fullWidth loading={submitting}>{submitLabel}</Button>
      </div>
    </form>
  )
}
