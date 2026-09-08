'use client'

import { useState } from 'react'
import { Plus, Landmark, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { AccountCard } from '@/components/accounts/account-card'
import { AccountForm } from '@/components/accounts/account-form'
import { useAccounts } from '@/hooks/use-accounts'
import { useAccountBalances } from '@/hooks/use-account-balances'
import { useToast } from '@/providers/toast-provider'
import { useSettings } from '@/providers/settings-provider'
import { useAllTransactions } from '@/providers/all-transactions-provider'
import type { Account } from '@/lib/types'

export default function AccountsPage() {
  const { defaultCurrency } = useSettings()
  const { accounts, loading, add, update, removeAndReassign } = useAccounts()
  const { balances, loading: balancesLoading } = useAccountBalances(defaultCurrency)
  const { transactions } = useAllTransactions()
  const { toast } = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [deleting, setDeleting] = useState<Account | null>(null)
  const [destinationId, setDestinationId] = useState('')
  const [busy, setBusy] = useState(false)

  // Transactions carry no currency of their own — they inherit the account's.
  // Moving them somewhere with a different currency would silently re-value them.
  const destinationOptions = deleting
    ? accounts.filter((a) => a.$id !== deleting.$id && a.currency === deleting.currency)
    : []

  // Counted from the already-loaded history rather than a separate query: it
  // avoids a second full download, and there is no loading or error state to
  // disambiguate before the Delete button can be enabled.
  const txnCount = deleting
    ? transactions.filter(
        (t) =>
          t.accountId === deleting.$id ||
          t.fromAccountId === deleting.$id ||
          t.toAccountId === deleting.$id
      ).length
    : 0

  const handleSetDeleting = (account: Account | null) => {
    setDeleting(account)
    setDestinationId('')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Accounts</h1>
          <p className="text-sm text-text-secondary">{accounts.length} account{accounts.length === 1 ? '' : 's'}</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus className="size-5" /> Add
        </Button>
      </div>

      {loading || balancesLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-[72px] rounded-[var(--radius-md)]" />
          <Skeleton className="h-[72px] rounded-[var(--radius-md)]" />
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={<Landmark className="size-6" />}
          title="No accounts yet"
          description="Add a Cash, Bank or Mobile Wallet account to start tracking."
          action={<Button onClick={() => { setEditing(null); setFormOpen(true) }}>Add account</Button>}
        />
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => (
            <div key={account.$id} className="relative">
              <div className="pr-12">
                <AccountCard account={account} balance={balances[account.$id] ?? 0} defaultCurrency={defaultCurrency} onClick={() => { setEditing(account); setFormOpen(true) }} />
              </div>
              <button
                onClick={() => handleSetDeleting(account)}
                aria-label={`Delete ${account.name}`}
                className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-text-tertiary hover:text-expense"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Sheet open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit account' : 'Add account'}>
        <AccountForm
          initial={editing ?? undefined}
          submitLabel={editing ? 'Save changes' : 'Add account'}
          onCancel={() => setFormOpen(false)}
          onSubmit={async (values) => {
            if (editing) {
              await update(editing.$id, { name: values.name, type: values.type })
              toast('Account updated', 'success')
            } else {
              await add(values)
              toast('Account added', 'success')
            }
            setFormOpen(false)
          }}
        />
      </Sheet>

      <Sheet open={!!deleting} onClose={() => handleSetDeleting(null)} title="Delete account">
        <p className="mb-4 text-sm text-text-secondary">
          Delete <span className="font-medium text-text-primary">{deleting?.name}</span>?
        </p>

        {txnCount === 0 ? (
          <p className="mb-4 rounded-[var(--radius-md)] bg-surface-hover px-3 py-2.5 text-xs text-text-secondary">
            No transactions use this account, so nothing needs to be moved.
          </p>
        ) : (
          <>
            <p className="mb-3 rounded-[var(--radius-md)] bg-surface-hover px-3 py-2.5 text-xs text-text-secondary">
              <span className="font-semibold text-text-primary">{txnCount}</span> transaction{txnCount === 1 ? '' : 's'} use
              this account. They will be <span className="font-semibold text-text-primary">moved</span>, not deleted —
              your totals and your people balances stay exactly the same.
            </p>
            {destinationOptions.length === 0 ? (
              <p className="mb-4 rounded-[var(--radius-md)] bg-expense-soft px-3 py-2.5 text-xs text-expense">
                There is no other {deleting?.currency} account to move them to. Create one first —
                transactions can only move between accounts sharing a currency, otherwise their
                amounts would change value.
              </p>
            ) : (
              <div className="mb-4">
                <Select
                  name="destination"
                  label="Move these transactions to"
                  value={destinationId}
                  onChange={(e) => setDestinationId(e.target.value)}
                >
                  <option value="">Select an account</option>
                  {destinationOptions.map((a) => (
                    <option key={a.$id} value={a.$id}>{a.name} ({a.currency})</option>
                  ))}
                </Select>
              </div>
            )}
          </>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => handleSetDeleting(null)}>Cancel</Button>
          <Button
            variant="danger"
            fullWidth
            loading={busy}
            disabled={txnCount > 0 && !destinationId}
            onClick={async () => {
              if (!deleting) return
              setBusy(true)
              try {
                const { moved } = await removeAndReassign(deleting.$id, destinationId)
                toast(moved > 0 ? `Account deleted — ${moved} transaction${moved === 1 ? '' : 's'} moved` : 'Account deleted', 'success')
                handleSetDeleting(null)
              } catch (e) {
                toast(e instanceof Error ? e.message : 'Failed to delete account', 'error')
              } finally {
                setBusy(false)
              }
            }}
          >
            Delete
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
