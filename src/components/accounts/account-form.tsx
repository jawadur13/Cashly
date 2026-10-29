'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { AccountIcon } from '@/components/ui/category-icon'
import { CURRENCIES } from '@/lib/currency/currencies'
import { cn } from '@/lib/utils'
import { useSettings } from '@/providers/settings-provider'
import { HelpTip } from '@/components/help/help-tip'
import type { Account, AccountType } from '@/lib/types'

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'mobile-wallet', label: 'Mobile wallet' },
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
      setError('Give the account a name')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit({ name: name.trim(), type, currency })
    } catch {
      setError("Couldn't save the account. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-text-secondary">Type</legend>
        <div className="grid grid-cols-3 gap-2">
          {ACCOUNT_TYPES.map((t) => {
            const selected = type === t.value
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                aria-pressed={selected}
                className={cn(
                  'pressable flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-[var(--radius-lg)] text-sm font-semibold',
                  selected ? 'bg-primary text-on-primary shadow-[var(--shadow-sm)]' : 'bg-surface text-text-secondary ring-1 ring-inset ring-border hover:text-text-primary'
                )}
              >
                <AccountIcon name={t.value} className="size-5" />
                {t.label}
              </button>
            )
          })}
        </div>
      </fieldset>
      <Input
        name="name"
        label="Name"
        placeholder="e.g. City Bank, bKash"
        autoFocus={!initial}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error ?? undefined}
      />
      {initial ? (
        <div className="flex gap-3 rounded-[var(--radius-md)] bg-surface-sunken px-4 py-3">
          <Lock className="mt-0.5 size-4 shrink-0 text-text-tertiary" aria-hidden />
          <p className="text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">{currency}</span> — an account&apos;s currency can&apos;t
            change, because every amount in it is stored in that currency.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
        <Select
          name="currency"
          label="Currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.name}
            </option>
          ))}
        </Select>
        <p className="flex items-center gap-1 text-xs text-text-tertiary">
          This can’t be changed later.
          <HelpTip title="Account currency" guide="account-currency" className="-my-3">
            <p>Every amount in an account is stored in its currency, so changing it later would change the value of everything already recorded.</p>
            <p>Need another currency? Create a separate account for it — for example a USD account for Payoneer.</p>
          </HelpTip>
        </p>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <Button variant="secondary" fullWidth onClick={onCancel}>Cancel</Button>
        <Button type="submit" fullWidth loading={submitting}>{submitLabel}</Button>
      </div>
    </form>
  )
}
