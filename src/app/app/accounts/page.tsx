'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Landmark, Pencil, Plus, Trash2 } from 'lucide-react'
import { Amount } from '@/components/ui/amount'
import { Button, BUTTON_BASE, BUTTON_SIZES, BUTTON_VARIANTS } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { Select } from '@/components/ui/select'
import { ListSkeleton, Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import { IconTile, ListGroup, ListRow, SectionHeader } from '@/components/ui/list'
import { AccountIcon } from '@/components/ui/category-icon'
import { AccountForm } from '@/components/accounts/account-form'
import { TransactionList } from '@/components/transactions/transaction-list'
import { incomeExpenseTotals, monthKeyOf, sortNewestFirst } from '@/lib/activity'
import { convertMinor } from '@/lib/currency/currencies'
import { cn } from '@/lib/utils'
import { useAccounts } from '@/hooks/use-accounts'
import { useAccountBalances } from '@/hooks/use-account-balances'
import { useExchangeRates } from '@/hooks/use-exchange-rates'
import { useToast } from '@/providers/toast-provider'
import { useSettings } from '@/providers/settings-provider'
import { useAllTransactions } from '@/providers/all-transactions-provider'
import type { Account, AccountType } from '@/lib/types'

const GROUPS: { type: AccountType; title: string }[] = [
  { type: 'cash', title: 'Cash' },
  { type: 'bank', title: 'Bank' },
  { type: 'mobile-wallet', title: 'Mobile wallets' },
]

type Mode = 'view' | 'edit' | 'delete'

export default function AccountsPage() {
  const { defaultCurrency } = useSettings()
  const { rates } = useExchangeRates()
  const { accounts, loading, error, refresh, add, update, removeAndReassign } = useAccounts()
  const { balances, total, loading: balancesLoading } = useAccountBalances(defaultCurrency)
  const { transactions } = useAllTransactions()
  const { toast } = useToast()
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState<Account | null>(null)
  const [mode, setMode] = useState<Mode>('view')
  const [destinationId, setDestinationId] = useState('')
  const [busy, setBusy] = useState(false)

  const toDefault = (a: Account) => convertMinor(balances[a.$id] ?? 0, a.currency, defaultCurrency, rates)
  const assets = accounts.reduce((s, a) => s + Math.max(0, toDefault(a)), 0)
  const overdrawn = accounts.reduce((s, a) => s + Math.min(0, toDefault(a)), 0)

  const touches = (a: Account) =>
    transactions.filter((t) => t.accountId === a.$id || t.fromAccountId === a.$id || t.toAccountId === a.$id)

  // Transactions carry no currency of their own — they inherit the account's.
  // Moving them somewhere with a different currency would silently re-value them.
  const destinationOptions = selected
    ? accounts.filter((a) => a.$id !== selected.$id && a.currency === selected.currency)
    : []
  const selectedHistory = selected ? sortNewestFirst(touches(selected)) : []
  const txnCount = selectedHistory.length
  const monthTotals = selected
    ? incomeExpenseTotals(
        selectedHistory.filter((t) => monthKeyOf(t.date) === monthKeyOf(new Date()) && t.accountId === selected.$id),
        (m) => m
      )
    : null

  function openAccount(a: Account) {
    setSelected(a)
    setMode('view')
    setDestinationId('')
  }
  function close() {
    setSelected(null)
    setMode('view')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Accounts"
        subtitle={`${accounts.length} account${accounts.length === 1 ? '' : 's'}`}
        actions={
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Add
          </Button>
        }
      />

      {loading || balancesLoading ? (
        <>
          <Skeleton className="h-32 rounded-[var(--radius-xl)]" />
          <ListSkeleton rows={4} />
        </>
      ) : error ? (
        <ErrorState what="your accounts" error={error} onRetry={refresh} />
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={<Landmark />}
          title="No accounts yet"
          description="Add the places your money lives — cash, a bank account, bKash or Nagad."
          action={<Button onClick={() => setAdding(true)}>Add an account</Button>}
        />
      ) : (
        <>
          <section className="hero-panel gold-hairline rounded-[var(--radius-xl)] p-5 shadow-[var(--shadow-lg)] md:p-6">
            <p className="text-sm font-medium text-hero-muted">Net worth</p>
            <Amount value={total} currency={defaultCurrency} className="mt-1 text-[2rem] font-semibold leading-tight tracking-tight" currencyClassName="text-[0.5em] opacity-70" />
            <dl className="mt-4 flex gap-6 border-t border-white/10 pt-3 text-sm">
              <div>
                <dt className="text-xs text-hero-muted">Assets</dt>
                <dd><Amount value={assets} currency={defaultCurrency} className="font-semibold" /></dd>
              </div>
              {overdrawn < 0 && (
                <div>
                  <dt className="text-xs text-hero-muted">Overdrawn</dt>
                  <dd><Amount value={overdrawn} currency={defaultCurrency} className="font-semibold text-[var(--red-400)]" /></dd>
                </div>
              )}
            </dl>
          </section>

          {GROUPS.map(({ type, title }) => {
            const group = accounts.filter((a) => a.type === type)
            if (group.length === 0) return null
            return (
              <section key={type} aria-label={title}>
                <SectionHeader title={title} />
                <ListGroup>
                  {group.map((a) => {
                    const balance = balances[a.$id] ?? 0
                    return (
                      <ListRow
                        key={a.$id}
                        onClick={() => openAccount(a)}
                        chevron
                        leading={<IconTile><AccountIcon name={a.type} /></IconTile>}
                        title={a.name}
                        subtitle={balance < 0 ? <span className="text-expense">Overdrawn</span> : a.currency}
                        trailing={<Amount value={balance} currency={a.currency} tone={balance < 0 ? 'expense' : 'neutral'} />}
                        trailingSub={
                          a.currency !== defaultCurrency ? (
                            <>≈ <Amount value={toDefault(a)} currency={defaultCurrency} /></>
                          ) : undefined
                        }
                      />
                    )
                  })}
                </ListGroup>
              </section>
            )
          })}
        </>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add account">
        <AccountForm
          submitLabel="Add account"
          onCancel={() => setAdding(false)}
          onSubmit={async (values) => {
            await add(values)
            toast(`${values.name} added`, 'success')
            setAdding(false)
          }}
        />
      </Sheet>

      <Sheet
        open={!!selected}
        onClose={close}
        title={mode === 'edit' ? 'Edit account' : mode === 'delete' ? `Delete ${selected?.name}?` : selected?.name}
        description={mode === 'view' && selected ? `${selected.currency} · ${txnCount} transaction${txnCount === 1 ? '' : 's'}` : undefined}
      >
        {selected && mode === 'view' && (
          <div className="space-y-5">
            <div className="rounded-[var(--radius-lg)] bg-surface-sunken p-4">
              <p className="text-xs font-medium text-text-tertiary">Balance</p>
              <Amount
                value={balances[selected.$id] ?? 0}
                currency={selected.currency}
                tone={(balances[selected.$id] ?? 0) < 0 ? 'expense' : 'neutral'}
                className="text-2xl font-semibold tracking-tight"
              />
              {monthTotals && (monthTotals.income !== 0 || monthTotals.expense !== 0) && (
                <p className="mt-2 text-sm text-text-secondary">
                  This month: in <Amount value={monthTotals.income} currency={selected.currency} tone="income" className="font-semibold" /> · out{' '}
                  <Amount value={monthTotals.expense} currency={selected.currency} className="font-semibold" />
                </p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="secondary" size="sm" onClick={() => setMode('edit')}><Pencil className="size-4" /> Edit</Button>
              <Link href={`/app/transactions?account=${selected.$id}`} className={cn(BUTTON_BASE, BUTTON_VARIANTS.secondary, BUTTON_SIZES.sm)}>
                Activity <ArrowRight className="size-4" />
              </Link>
              <Button variant="secondary" size="sm" className="text-expense" onClick={() => setMode('delete')}><Trash2 className="size-4" /> Delete</Button>
            </div>
            {selectedHistory.length > 0 && (
              <div>
                <SectionHeader title="Recent" />
                <TransactionList transactions={selectedHistory.slice(0, 5)} grouped={false} hideAccount />
              </div>
            )}
          </div>
        )}

        {selected && mode === 'edit' && (
          <AccountForm
            initial={selected}
            submitLabel="Save changes"
            onCancel={() => setMode('view')}
            onSubmit={async (values) => {
              const updated = await update(selected.$id, { name: values.name, type: values.type })
              setSelected(updated)
              setMode('view')
              toast('Account updated', 'success')
            }}
          />
        )}

        {selected && mode === 'delete' && (
          <div className="space-y-4">
            {txnCount === 0 ? (
              <p className="text-sm text-text-secondary">No transactions use this account, so nothing needs to move.</p>
            ) : (
              <>
                <p className="text-sm text-text-secondary">
                  <span className="font-semibold text-text-primary">{txnCount}</span> transaction{txnCount === 1 ? '' : 's'} use this
                  account. They&apos;ll be <span className="font-semibold text-text-primary">moved</span>, not deleted — your totals
                  and people balances stay exactly the same.
                </p>
                {destinationOptions.length === 0 ? (
                  <p className="rounded-[var(--radius-md)] bg-expense-soft px-3.5 py-3 text-sm text-expense">
                    There&apos;s no other {selected.currency} account to move them to. Add one first — transactions can only move
                    between accounts with the same currency.
                  </p>
                ) : (
                  <Select name="destination" label="Move them to" value={destinationId} onChange={(e) => setDestinationId(e.target.value)}>
                    <option value="">Choose an account</option>
                    {destinationOptions.map((a) => (
                      <option key={a.$id} value={a.$id}>{a.name}</option>
                    ))}
                  </Select>
                )}
              </>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" fullWidth onClick={() => setMode('view')}>Cancel</Button>
              <Button
                variant="danger"
                fullWidth
                loading={busy}
                disabled={txnCount > 0 && !destinationId}
                onClick={async () => {
                  setBusy(true)
                  try {
                    const { moved } = await removeAndReassign(selected.$id, destinationId)
                    toast(moved > 0 ? `${selected.name} deleted — ${moved} transaction${moved === 1 ? '' : 's'} moved` : `${selected.name} deleted`, 'success')
                    close()
                  } catch (e) {
                    toast(e instanceof Error ? e.message : "Couldn't delete the account.", 'error')
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                Delete account
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
