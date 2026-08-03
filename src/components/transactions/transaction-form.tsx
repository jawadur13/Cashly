'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Chip } from '@/components/ui/chip'
import { Sheet } from '@/components/ui/sheet'
import { CategoryIcon } from '@/components/ui/category-icon'
import { CURRENCIES } from '@/lib/currency/currencies'
import { useSettings } from '@/providers/settings-provider'
import type { Account, Category, Transaction, TransactionType } from '@/lib/types'

export interface TransactionFormValues {
  accountId: string
  type: TransactionType
  amount: string
  currency: string
  categoryId: string
  payee: string
  note: string
  date: string
  time: string
}

interface TransactionFormProps {
  accounts: Account[]
  categories: Category[]
  initial?: Transaction
  onSubmit: (values: {
    accountId: string
    type: TransactionType
    amount: number
    currency: string
    categoryId: string
    payee: string
    note: string
    date: string
    time: string
  }) => Promise<void>
  onDelete?: () => Promise<void>
  onCancel: () => void
  submitLabel: string
}

export function TransactionForm({
  accounts,
  categories,
  initial,
  onSubmit,
  onDelete,
  onCancel,
  submitLabel,
}: TransactionFormProps) {
  const router = useRouter()
  const { defaultCurrency } = useSettings()
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense')
  const [accountId, setAccountId] = useState(initial?.accountId ?? '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [currency, setCurrency] = useState(initial?.currency ?? defaultCurrency)
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '')
  const [payee, setPayee] = useState(initial?.payee ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [date, setDate] = useState(() => {
    if (initial?.date) {
      const d = new Date(initial.date)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })
  const [time, setTime] = useState(() => {
    if (initial?.date) {
      const d = new Date(initial.date)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  )

  const selectAccount = useMemo(() => {
    if (accountId && accounts.some((a) => a.$id === accountId)) return accounts.find((a) => a.$id === accountId)!
    return accounts[0]
  }, [accountId, accounts])

  const currentAccountId = selectAccount?.$id ?? accountId
  const effectiveCurrency = initial ? currency : (selectAccount?.currency ?? defaultCurrency)

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!amount || Number(amount) <= 0) next.amount = 'Enter an amount greater than zero'
    if (!categoryId) next.categoryId = 'Choose a category'
    if (!date) next.date = 'Choose a date'
    if (!time) next.time = 'Choose a time'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      await onSubmit({
        accountId: currentAccountId,
        type,
        amount: Number(amount),
        currency: effectiveCurrency,
        categoryId,
        payee: payee.trim(),
        note: note.trim(),
        date: new Date(date + 'T' + time).toISOString(),
      })
      router.push('/app/transactions')
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Something went wrong' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    setSubmitting(true)
    try {
      await onDelete()
      router.push('/app/transactions')
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Failed to delete' })
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-8">
      <SegmentedControl value={type} onChange={(t) => { setType(t); setCategoryId('') }} />

      <Select
        name="account"
        label="Account"
        value={currentAccountId}
        onChange={(e) => { setAccountId(e.target.value); setCurrency(accounts.find((a) => a.$id === e.target.value)?.currency ?? defaultCurrency) }}
      >
        {accounts.length === 0 && <option value="">No accounts — create one first</option>}
        {accounts.map((a) => (
          <option key={a.$id} value={a.$id}>{a.name}</option>
        ))}
      </Select>

      <div className="grid grid-cols-2 gap-3">
        <Input
          name="amount"
          label="Amount"
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
        />
        <Select
          name="currency"
          label="Currency"
          value={effectiveCurrency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.code}</option>
          ))}
        </Select>
      </div>

      <div>
        <span className="mb-1.5 block text-[0.8125rem] font-medium text-text-secondary">Category</span>
        {filteredCategories.length === 0 ? (
          <p className="text-sm text-text-tertiary">No {type} categories available.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {filteredCategories.map((c) => {
              const selected = categoryId === c.$id
              return (
                <Chip
                  key={c.$id}
                  selected={selected}
                  onClick={() => setCategoryId(c.$id)}
                  icon={<CategoryIcon name={c.icon} className="size-4" />}
                >
                  {c.name}
                </Chip>
              )
            })}
          </div>
        )}
        {errors.categoryId && <p className="mt-1 text-xs text-expense">{errors.categoryId}</p>}
      </div>

      <Input
        name="payee"
        label="Merchant / Payee (optional)"
        placeholder="e.g. Starbucks, Salary"
        value={payee}
        onChange={(e) => setPayee(e.target.value)}
      />

      <Input
        name="note"
        label="Note (optional)"
        placeholder="Add a note…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          name="date"
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={errors.date}
        />
        <Input
          name="time"
          label="Time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          error={errors.time}
        />
      </div>

      {errors.form && (
        <p className="rounded-[var(--radius-md)] bg-expense-soft px-3.5 py-2.5 text-sm text-expense">
          {errors.form}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel}>Cancel</Button>
        <Button type="submit" fullWidth loading={submitting}>{submitLabel}</Button>
      </div>

      {onDelete && (
        <>
          <Button type="button" variant="danger" fullWidth onClick={() => setConfirmDelete(true)}>
            Delete transaction
          </Button>
          <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete transaction">
            <p className="mb-4 text-sm text-text-secondary">
              This will permanently delete this transaction. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" fullWidth onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" fullWidth loading={submitting} onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </Sheet>
        </>
      )}
    </form>
  )
}
