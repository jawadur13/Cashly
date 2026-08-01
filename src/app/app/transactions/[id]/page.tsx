'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { useAccounts } from '@/hooks/use-accounts'
import { useCategories } from '@/hooks/use-categories'
import { useTransactions } from '@/hooks/use-transactions'
import { useToast } from '@/providers/toast-provider'
import { getTransaction } from '@/lib/appwrite/collections'
import type { Transaction } from '@/lib/types'

export default function EditTransactionPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { accounts, loading: accountsLoading } = useAccounts()
  const { categories, loading: categoriesLoading } = useCategories()
  const { update, remove } = useTransactions({})
  const { toast } = useToast()
  const [initial, setInitial] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getTransaction(params.id)
      .then((t) => {
        if (active) setInitial(t)
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load transaction')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [params.id])

  return (
    <div className="space-y-5">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <ChevronLeft className="size-4" /> Back
      </button>
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Edit transaction</h1>
        <p className="text-sm text-text-secondary">Update the details below</p>
      </div>
      {loading || accountsLoading || categoriesLoading ? (
        <p className="text-sm text-text-tertiary">Loadingâ€¦</p>
      ) : error ? (
        <p className="rounded-[var(--radius-md)] bg-expense-soft px-3.5 py-2.5 text-sm text-expense">
          {error}
        </p>
      ) : initial ? (
        <TransactionForm
          accounts={accounts}
          categories={categories}
          initial={initial}
          submitLabel="Save changes"
          onCancel={() => router.back()}
          onSubmit={async (values) => {
            await update(initial.$id, values)
            toast('Transaction updated', 'success')
          }}
          onDelete={async () => {
            await remove(initial.$id)
            toast('Transaction deleted', 'success')
          }}
        />
      ) : null}
    </div>
  )
}
