'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Chip } from '@/components/ui/chip'
import { Sheet } from '@/components/ui/sheet'
import { CategoryIcon, AccountIcon } from '@/components/ui/category-icon'
import { Amount } from '@/components/ui/amount'
import { CategoryForm } from '@/components/categories/category-form'
import { minorToInputValue, readAmountMinor, readFromAmountMinor, readToAmountMinor, toMinorUnits } from '@/lib/money'
import { formatMoney } from '@/lib/currency/format'
import { categoryUsage, personRecency, recentPayees } from '@/lib/activity'
import { cn } from '@/lib/utils'
import { useAccounts } from '@/hooks/use-accounts'
import { useCategories } from '@/hooks/use-categories'
import { usePeople } from '@/hooks/use-people'
import { useTransactionActions, type TransactionInput } from '@/hooks/use-transactions'
import { useAllTransactions } from '@/providers/all-transactions-provider'
import { useSettings } from '@/providers/settings-provider'
import { useToast } from '@/providers/toast-provider'
import type { QuickAddPreset } from './quick-add'
import { TYPE_LABELS } from './transaction-row'
import type { Account, Transaction, TransactionType } from '@/lib/types'

interface TransactionFormProps {
  initial?: Transaction
  preset?: QuickAddPreset
  /** Called after a successful save. `addAnother` keeps the form open for the next one. */
  onSaved: (saved: Transaction, options: { addAnother: boolean }) => void
  /** Edit mode only. Called after the delete; the caller offers Undo. */
  onDeleted?: (deleted: Transaction) => void
  onCancel: () => void
  /** Where it is rendered: sizes the sticky save bar to its container. */
  variant?: 'sheet' | 'page'
}

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = (
  ['expense', 'income', 'exchange', 'give', 'take'] as TransactionType[]
).map((value) => ({ value, label: TYPE_LABELS[value] }))

const COLLAPSED_CATEGORIES = 8

function localDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function localTime(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Keeps a decimal amount as typed: digits, one point, at most two decimals. */
function sanitizeAmount(raw: string): string {
  const cleaned = raw.replace(/,/g, '').replace(/[^\d.]/g, '')
  const [whole, ...rest] = cleaned.split('.')
  if (rest.length === 0) return whole.replace(/^0+(?=\d)/, '')
  return `${whole.replace(/^0+(?=\d)/, '') || '0'}.${rest.join('').slice(0, 2)}`
}

const lastAccountKey = (type: TransactionType) => `cashly-last-account:${type}`
function readLastAccount(type: TransactionType): string | null {
  try {
    return window.localStorage.getItem(lastAccountKey(type))
  } catch {
    return null
  }
}

function AccountChips({
  accounts,
  value,
  onChange,
  label,
  error,
  exclude,
}: {
  accounts: Account[]
  value: string
  onChange: (id: string) => void
  label: string
  error?: string
  exclude?: string
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-text-secondary">{label}</legend>
      {accounts.length === 0 ? (
        <p className="text-sm text-text-tertiary">No accounts in this currency yet.</p>
      ) : (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none" data-error={error ? true : undefined}>
          {accounts
            .filter((a) => a.$id !== exclude)
            .map((a) => (
              <Chip
                key={a.$id}
                selected={value === a.$id}
                onClick={() => onChange(a.$id)}
                icon={<AccountIcon name={a.type} className="size-4" />}
                className="shrink-0"
              >
                {a.name}
              </Chip>
            ))}
        </div>
      )}
      {error && <p className="mt-2 text-sm font-medium text-expense">{error}</p>}
    </fieldset>
  )
}

/**
 * Add or edit a transaction. Amount first and large, smart defaults (last
 * account used for the type, favourite categories first, today), and a sticky
 * save bar. Every amount goes through `toMinorUnits`; the values sent are the
 * same shape as before, so no calculation changes.
 */
export function TransactionForm({ initial, preset, onSaved, onDeleted, onCancel, variant = 'sheet' }: TransactionFormProps) {
  const { accounts } = useAccounts()
  const { categories, add: addCategory } = useCategories()
  const { people, add: addPerson } = usePeople()
  const { transactions } = useAllTransactions()
  const { defaultCurrency } = useSettings()
  const { add, update, remove } = useTransactionActions()
  const { toast } = useToast()
  const formRef = useRef<HTMLFormElement>(null)

  const now = useMemo(() => new Date(), [])
  const initialDate = initial ? new Date(initial.date) : now
  const [type, setType] = useState<TransactionType>(initial?.type ?? preset?.type ?? 'expense')
  const [accountId, setAccountId] = useState(initial?.accountId ?? preset?.accountId ?? '')
  const [amount, setAmount] = useState(
    initial && initial.type !== 'exchange'
      ? minorToInputValue(readAmountMinor(initial))
      : preset?.amountMinor
        ? minorToInputValue(preset.amountMinor)
        : ''
  )
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '')
  const [personId, setPersonId] = useState(initial?.personId ?? preset?.personId ?? '')
  const [payee, setPayee] = useState(initial?.payee ?? '')
  const [note, setNote] = useState(initial?.note ?? preset?.note ?? '')
  const [date, setDate] = useState(localDate(initialDate))
  const [time, setTime] = useState(localTime(initialDate))
  const [fromAccountId, setFromAccountId] = useState(initial?.fromAccountId ?? '')
  const [toAccountId, setToAccountId] = useState(initial?.toAccountId ?? '')
  const [sent, setSent] = useState(initial?.type === 'exchange' ? minorToInputValue(readFromAmountMinor(initial)) : '')
  const [received, setReceived] = useState(initial?.type === 'exchange' ? minorToInputValue(readToAmountMinor(initial)) : '')
  const [differentReceived, setDifferentReceived] = useState(
    initial?.type === 'exchange' ? readFromAmountMinor(initial) !== readToAmountMinor(initial) : false
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<null | 'save' | 'another' | 'delete'>(null)
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [newCategoryOpen, setNewCategoryOpen] = useState(false)
  const [newPersonOpen, setNewPersonOpen] = useState(false)
  const [newPersonName, setNewPersonName] = useState('')
  const [pickDate, setPickDate] = useState(false)

  const isExchange = type === 'exchange'
  const isPerson = type === 'give' || type === 'take'

  // On edit the stored currency wins: re-saving must never relabel an existing
  // row (500 USD silently becoming 500 BDT), so only same-currency accounts are
  // offered. A transaction's currency is always its account's currency.
  const selectableAccounts = useMemo(
    () => (initial ? accounts.filter((a) => a.currency === initial.currency) : accounts),
    [accounts, initial]
  )

  // Default account: the preset, else the last one used for this type, else the first.
  useEffect(() => {
    if (initial || selectableAccounts.length === 0) return
    const valid = (id: string | null | undefined) => Boolean(id && selectableAccounts.some((a) => a.$id === id))
    if (!valid(accountId)) {
      const remembered = readLastAccount(type)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAccountId(valid(preset?.accountId) ? preset!.accountId! : valid(remembered) ? remembered! : selectableAccounts[0].$id)
    }
    if (isExchange && !valid(fromAccountId)) {
      const remembered = readLastAccount('exchange')
      setFromAccountId(valid(remembered) ? remembered! : selectableAccounts[0].$id)
    }
  }, [initial, selectableAccounts, accountId, type, preset, isExchange, fromAccountId])

  const account = selectableAccounts.find((a) => a.$id === accountId)
  const fromAccount = accounts.find((a) => a.$id === fromAccountId)
  const toAccount = accounts.find((a) => a.$id === toAccountId)
  const currency = initial ? initial.currency : (isExchange ? fromAccount?.currency : account?.currency) ?? defaultCurrency
  const transferTargets = selectableAccounts.filter((a) => !fromAccount || a.currency === fromAccount.currency)

  const sortedCategories = useMemo(() => {
    const usage = categoryUsage(transactions, type)
    return categories
      .filter((c) => c.type === type)
      .sort((a, b) => (usage.get(b.$id) ?? 0) - (usage.get(a.$id) ?? 0) || a.name.localeCompare(b.name))
  }, [categories, transactions, type])
  const selectedIndex = sortedCategories.findIndex((c) => c.$id === categoryId)
  const visibleCategories =
    showAllCategories || sortedCategories.length <= COLLAPSED_CATEGORIES + 1
      ? sortedCategories
      : sortedCategories.slice(0, Math.max(COLLAPSED_CATEGORIES, selectedIndex + 1))

  const sortedPeople = useMemo(() => {
    const recency = personRecency(transactions)
    return [...people].sort((a, b) => (recency.get(b.$id) ?? 0) - (recency.get(a.$id) ?? 0) || a.name.localeCompare(b.name))
  }, [people, transactions])

  const payeeSuggestions = useMemo(() => recentPayees(transactions), [transactions])

  const sentMinor = toMinorUnits(sent)
  const receivedMinor = differentReceived ? toMinorUnits(received) : sentMinor
  const transferDiff = receivedMinor - sentMinor

  function changeType(next: TransactionType) {
    setType(next)
    setCategoryId('')
    if (next !== 'give' && next !== 'take') setPersonId(preset?.personId ?? '')
    setErrors({})
    if (!initial) {
      const remembered = readLastAccount(next)
      if (remembered && selectableAccounts.some((a) => a.$id === remembered)) setAccountId(remembered)
    }
    // Carry the typed amount across, so switching type never loses it.
    if (next === 'exchange' && !sent && amount) setSent(amount)
    if (next !== 'exchange' && !amount && sent) setAmount(sent)
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {}
    if (isExchange) {
      if (!fromAccountId) next.fromAccountId = 'Choose the account the money left'
      if (!toAccountId) next.toAccountId = 'Choose the account it went to'
      else if (fromAccountId === toAccountId) next.toAccountId = 'Choose a different account'
      else if (fromAccount && toAccount && fromAccount.currency !== toAccount.currency) {
        next.toAccountId = 'Both accounts must use the same currency'
      }
      if (sentMinor <= 0) next.amount = 'Enter the amount sent'
      if (differentReceived && toMinorUnits(received) <= 0) next.received = 'Enter the amount received'
    } else {
      if (!account) next.accountId = 'Choose an account'
      if (toMinorUnits(amount) <= 0) next.amount = 'Enter an amount'
      if (isPerson && !personId) next.personId = 'Choose a person'
      if (!isPerson && !categoryId) next.categoryId = 'Choose a category'
    }
    if (!date) next.date = 'Choose a date'
    return next
  }

  async function save(addAnother: boolean) {
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      // Bring the first problem into view.
      requestAnimationFrame(() => {
        const el = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"],[data-error="true"]')
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        if (el instanceof HTMLInputElement) el.focus({ preventScroll: true })
      })
      return
    }
    setSubmitting(addAnother ? 'another' : 'save')
    const values: TransactionInput = {
      accountId: isExchange ? fromAccountId : accountId,
      type,
      // A transfer's own amount is the difference between its legs (the fee or
      // gain), exactly as before; the legs carry the amounts moved.
      amountMinor: isExchange ? Math.abs(transferDiff) : toMinorUnits(amount),
      currency,
      categoryId: isExchange || isPerson ? '' : categoryId,
      payee: isExchange || isPerson ? '' : payee.trim(),
      note: note.trim(),
      date: new Date(`${date}T${time || '12:00'}`).toISOString(),
      ...(isPerson ? { personId } : {}),
      ...(isExchange ? { fromAccountId, toAccountId, fromAmountMinor: sentMinor, toAmountMinor: receivedMinor } : {}),
    }
    try {
      const saved = initial ? await update(initial.$id, values) : await add(values)
      try {
        window.localStorage.setItem(lastAccountKey(type), values.accountId)
      } catch {
        // not remembered this time
      }
      onSaved(saved, { addAnother })
      if (addAnother) {
        setAmount('')
        setSent('')
        setReceived('')
        setNote('')
        setPayee('')
        setErrors({})
        formRef.current?.querySelector<HTMLInputElement>('input[name="amount"]')?.focus()
      }
    } catch {
      setErrors({ form: "Couldn't save. Check your connection and try again — nothing was saved." })
    } finally {
      setSubmitting(null)
    }
  }

  async function handleDelete() {
    if (!initial) return
    setSubmitting('delete')
    try {
      await remove(initial)
      onDeleted?.(initial)
    } catch {
      setErrors({ form: "Couldn't delete. Check your connection and try again." })
      setSubmitting(null)
    }
  }

  const isToday = date === localDate(new Date())
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date === localDate(yesterday)
  const amountLabel = isExchange ? 'Amount sent' : 'Amount'

  return (
    <>
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void save(false)
      }}
      className="flex flex-col gap-6"
    >
      <SegmentedControl label="Transaction type" value={type} onChange={changeType} options={TYPE_OPTIONS} />

      {/* Amount — the one thing every transaction needs, first and large. */}
      <div>
        <label htmlFor="tx-amount" className="mb-2 block text-sm font-medium text-text-secondary">
          {amountLabel}
        </label>
        <div
          className={cn(
            'flex items-baseline gap-2 rounded-[var(--radius-lg)] bg-surface px-4 py-3 ring-1 ring-inset transition-shadow focus-within:ring-2',
            errors.amount ? 'ring-expense' : 'ring-border focus-within:ring-accent'
          )}
        >
          <span className="text-lg font-semibold text-text-tertiary">{currency}</span>
          <input
            id="tx-amount"
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            autoFocus={!initial}
            placeholder="0"
            aria-invalid={errors.amount ? true : undefined}
            aria-describedby={errors.amount ? 'tx-amount-error' : undefined}
            value={isExchange ? sent : amount}
            onChange={(e) => (isExchange ? setSent(sanitizeAmount(e.target.value)) : setAmount(sanitizeAmount(e.target.value)))}
            className="min-w-0 flex-1 bg-transparent text-[2.25rem] font-semibold leading-tight tracking-tight text-text-primary tabular-nums outline-none placeholder:text-text-tertiary/60"
          />
        </div>
        {errors.amount && (
          <p id="tx-amount-error" className="mt-2 text-sm font-medium text-expense">
            {errors.amount}
          </p>
        )}
      </div>

      {isExchange ? (
        <>
          <AccountChips
            label="From"
            accounts={selectableAccounts}
            value={fromAccountId}
            onChange={(id) => {
              setFromAccountId(id)
              if (id === toAccountId) setToAccountId('')
            }}
            error={errors.fromAccountId}
          />
          <div className="-my-3 flex justify-center">
            <button
              type="button"
              onClick={() => {
                if (!toAccountId) return
                setFromAccountId(toAccountId)
                setToAccountId(fromAccountId)
              }}
              aria-label="Swap from and to accounts"
              className="pressable flex size-11 items-center justify-center rounded-full bg-surface text-text-secondary ring-1 ring-border hover:text-text-primary"
            >
              <ArrowDownUp className="size-4" />
            </button>
          </div>
          <AccountChips
            label="To"
            accounts={transferTargets}
            value={toAccountId}
            onChange={setToAccountId}
            error={errors.toAccountId}
            exclude={fromAccountId}
          />
          <div className="space-y-3">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={differentReceived}
                onChange={(e) => {
                  setDifferentReceived(e.target.checked)
                  if (e.target.checked && !received) setReceived(sent)
                }}
                className="size-5 accent-[var(--primary)]"
              />
              A different amount arrived (fee or gain)
            </label>
            {differentReceived && (
              <Input
                name="received"
                label="Amount received"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={received}
                onChange={(e) => setReceived(sanitizeAmount(e.target.value))}
                error={errors.received}
                leading={<span className="text-sm font-semibold text-text-tertiary">{toAccount?.currency ?? currency}</span>}
                className="pl-14"
              />
            )}
            {sentMinor > 0 && transferDiff !== 0 && fromAccount && toAccount && fromAccount.currency === toAccount.currency && (
              <p className="rounded-[var(--radius-md)] bg-surface-sunken px-3.5 py-2.5 text-sm text-text-secondary">
                {transferDiff < 0 ? 'Fee' : 'Gain'}:{' '}
                <span className="font-semibold text-text-primary">{formatMoney(Math.abs(transferDiff), currency)}</span>
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <AccountChips
            label={type === 'income' || type === 'take' ? 'Into account' : 'From account'}
            accounts={selectableAccounts}
            value={accountId}
            onChange={setAccountId}
            error={errors.accountId}
          />

          {isPerson ? (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-text-secondary">
                {type === 'give' ? 'Gave to' : 'Got from'}
              </legend>
              <div className="flex flex-wrap gap-2" data-error={errors.personId ? true : undefined}>
                {sortedPeople.map((p) => (
                  <Chip key={p.$id} selected={personId === p.$id} onClick={() => setPersonId(p.$id)}>
                    {p.name}
                  </Chip>
                ))}
                <Chip onClick={() => setNewPersonOpen(true)} icon={<Plus className="size-4" />}>
                  Add person
                </Chip>
              </div>
              {errors.personId && <p className="mt-2 text-sm font-medium text-expense">{errors.personId}</p>}
            </fieldset>
          ) : (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-text-secondary">Category</legend>
              <div className="flex flex-wrap gap-2" data-error={errors.categoryId ? true : undefined}>
                {visibleCategories.map((c) => (
                  <Chip
                    key={c.$id}
                    selected={categoryId === c.$id}
                    onClick={() => setCategoryId(c.$id)}
                    icon={<CategoryIcon name={c.icon} className="size-4" />}
                  >
                    {c.name}
                  </Chip>
                ))}
                {visibleCategories.length < sortedCategories.length && (
                  <Chip onClick={() => setShowAllCategories(true)}>
                    More ({sortedCategories.length - visibleCategories.length})
                  </Chip>
                )}
                <Chip onClick={() => setNewCategoryOpen(true)} icon={<Plus className="size-4" />}>
                  New
                </Chip>
              </div>
              {errors.categoryId && <p className="mt-2 text-sm font-medium text-expense">{errors.categoryId}</p>}
            </fieldset>
          )}
        </>
      )}

      <div className="grid gap-4">
        {!isExchange && !isPerson && (
          <>
            <Input
              name="payee"
              label={type === 'income' ? 'Received from (optional)' : 'Paid to (optional)'}
              placeholder={type === 'income' ? 'e.g. employer, client' : 'e.g. Shwapno, Pathao'}
              list="tx-payees"
              autoComplete="off"
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
            />
            <datalist id="tx-payees">
              {payeeSuggestions.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </>
        )}
        <Input
          name="note"
          label="Note (optional)"
          placeholder={isExchange ? 'e.g. ATM withdrawal' : isPerson ? 'e.g. lunch money' : 'What was it for?'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-text-secondary">When</legend>
        <div className="flex flex-wrap items-center gap-2">
          <Chip selected={isToday && !pickDate} onClick={() => { setDate(localDate(new Date())); setPickDate(false) }}>
            Today
          </Chip>
          <Chip selected={isYesterday && !pickDate} onClick={() => { setDate(localDate(yesterday)); setPickDate(false) }}>
            Yesterday
          </Chip>
          <Chip selected={pickDate || (!isToday && !isYesterday)} onClick={() => setPickDate(true)}>
            {pickDate || isToday || isYesterday ? 'Pick a date' : new Date(`${date}T00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
          </Chip>
          <label className="sr-only" htmlFor="tx-time">Time</label>
          <input
            id="tx-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="min-h-11 rounded-[var(--radius-full)] bg-surface px-4 text-sm font-semibold text-text-secondary ring-1 ring-inset ring-border focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        {(pickDate || (!isToday && !isYesterday)) && (
          <Input
            name="date"
            type="date"
            aria-label="Date"
            className="mt-3"
            value={date}
            max={localDate(new Date())}
            onChange={(e) => setDate(e.target.value)}
            error={errors.date}
          />
        )}
      </fieldset>

      {errors.form && (
        <p role="alert" className="rounded-[var(--radius-md)] border border-expense/30 bg-expense-soft px-3.5 py-3 text-sm font-medium text-expense">
          {errors.form}
        </p>
      )}

      <div
        className={cn(
          'sticky bottom-0 mt-2 flex flex-col gap-2 border-t border-border bg-surface-raised/95 pt-3 backdrop-blur',
          variant === 'sheet'
            ? '-mx-5 -mb-5 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))]'
            : '-mx-4 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:mx-0 md:rounded-[var(--radius-lg)] md:border md:px-4 md:pb-4'
        )}
      >
        {!isExchange && (toMinorUnits(amount) > 0) && (
          <p className="text-center text-xs text-text-tertiary">
            {TYPE_LABELS[type]}{' '}
            <Amount value={toMinorUnits(amount)} currency={currency} className="font-semibold text-text-secondary" />
            {account ? ` · ${account.name}` : ''}
          </p>
        )}
        <Button type="submit" fullWidth loading={submitting === 'save'} disabled={submitting !== null}>
          {initial ? 'Save changes' : `Save ${TYPE_LABELS[type].toLowerCase()}`}
        </Button>
        <div className="flex gap-2">
          {initial ? (
            <Button
              variant="secondary"
              onClick={handleDelete}
              loading={submitting === 'delete'}
              disabled={submitting !== null}
              fullWidth
              className="text-expense"
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          ) : (
            <Button variant="secondary" fullWidth onClick={onCancel} disabled={submitting !== null}>
              Cancel
            </Button>
          )}
          {!initial && (
            <Button variant="secondary" fullWidth onClick={() => save(true)} loading={submitting === 'another'} disabled={submitting !== null}>
              Save & add another
            </Button>
          )}
          {initial && (
            <Button variant="secondary" fullWidth onClick={onCancel} disabled={submitting !== null}>
              Cancel
            </Button>
          )}
        </div>
      </div>

    </form>

      <Sheet open={newCategoryOpen} onClose={() => setNewCategoryOpen(false)} title="New category">
        <CategoryForm
          defaultType={type === 'income' ? 'income' : 'expense'}
          submitLabel="Add category"
          onCancel={() => setNewCategoryOpen(false)}
          onSubmit={async (values) => {
            const created = await addCategory(values)
            setNewCategoryOpen(false)
            if (created.type === type) setCategoryId(created.$id)
            toast(`${created.name} added`, 'success')
          }}
        />
      </Sheet>

      <Sheet open={newPersonOpen} onClose={() => setNewPersonOpen(false)} title="Add person">
        <div className="space-y-4">
          <Input
            name="newPersonName"
            label="Name"
            placeholder="e.g. Rahim"
            value={newPersonName}
            onChange={(e) => setNewPersonName(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setNewPersonOpen(false)}>
              Cancel
            </Button>
            <Button
              fullWidth
              disabled={!newPersonName.trim()}
              onClick={async () => {
                try {
                  const created = await addPerson({ name: newPersonName.trim() })
                  setPersonId(created.$id)
                  setNewPersonName('')
                  setNewPersonOpen(false)
                } catch {
                  toast("Couldn't add this person. Please try again.", 'error')
                }
              }}
            >
              Add person
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  )
}
