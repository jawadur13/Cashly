'use client'

import { useState } from 'react'
import { Plus, Landmark, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { AccountCard } from '@/components/accounts/account-card'
import { AccountForm } from '@/components/accounts/account-form'
import { useAccounts } from '@/hooks/use-accounts'
import { useAccountBalances } from '@/hooks/use-account-balances'
import { useToast } from '@/providers/toast-provider'
import { useSettings } from '@/providers/settings-provider'
import { useAuth } from '@/providers/auth-provider'
import { countTransactionsByAccount } from '@/lib/appwrite/collections'
import type { Account } from '@/lib/types'

export default function AccountsPage() {
  const { defaultCurrency } = useSettings()
  const { user } = useAuth()
  const { accounts, loading, add, update, remove } = useAccounts()
  const { balances, loading: balancesLoading } = useAccountBalances(defaultCurrency)
  const { toast } = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [deleting, setDeleting] = useState<Account | null>(null)
  const [txnCount, setTxnCount] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const handleSetDeleting = async (account: Account | null) => {
    setDeleting(account)
    if (account && user) {
      try {
        const count = await countTransactionsByAccount(user.$id, account.$id)
        setTxnCount(count)
      } catch {
        setTxnCount(null)
      }
    } else {
      setTxnCount(null)
    }
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
            <div key={account.$id} className="group relative">
              <AccountCard account={account} balance={balances[account.$id] ?? 0} defaultCurrency={defaultCurrency} onClick={() => { setEditing(account); setFormOpen(true) }} />
              <button
                onClick={() => handleSetDeleting(account)}
                aria-label={`Delete ${account.name}`}
                className="absolute right-3 top-1/2 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full text-text-tertiary hover:text-expense group-hover:flex"
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
              await update(editing.$id, values)
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
          Delete <span className="font-medium text-text-primary">{deleting?.name}</span>? This does not delete its
          transactions, but the account can no longer be selected.
        </p>
        {txnCount != null && txnCount > 0 && (
          <p className="mb-4 rounded-[var(--radius-md)] bg-surface-hover px-3 py-2.5 text-xs text-text-secondary">
            <span className="font-semibold text-text-primary">{txnCount}</span> transaction{txnCount === 1 ? '' : 's'} currently use this account.
          </p>
        )}
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => handleSetDeleting(null)}>Cancel</Button>
          <Button
            variant="danger"
            fullWidth
            loading={busy}
            onClick={async () => {
              if (!deleting) return
              setBusy(true)
              try {
                await remove(deleting.$id)
                toast('Account deleted', 'success')
                handleSetDeleting(null)
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
