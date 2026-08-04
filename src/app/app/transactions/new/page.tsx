'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { useAccounts } from '@/hooks/use-accounts'
import { useCategories } from '@/hooks/use-categories'
import { useTransactions } from '@/hooks/use-transactions'
import { useToast } from '@/providers/toast-provider'

export default function NewTransactionPage() {
  const router = useRouter()
  const { accounts, loading: accountsLoading } = useAccounts()
  const { categories, loading: categoriesLoading } = useCategories()
  const { add } = useTransactions({})
  const { toast } = useToast()

  return (
    <div className="space-y-5">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <ChevronLeft className="size-4" /> Back
      </button>
      <div>
        <h1 className="text-lg font-semibold text-text-primary">New transaction</h1>
        <p className="text-sm text-text-secondary">Record income, expense, or exchange</p>
      </div>
      {(accountsLoading || categoriesLoading) ? (
        <p className="text-sm text-text-tertiary">Loading...</p>
      ) : (
        <TransactionForm
          accounts={accounts}
          categories={categories}
          submitLabel="Save transaction"
          onCancel={() => router.back()}
          onSubmit={async (values) => {
            await add(values)
            toast('Transaction saved', 'success')
          }}
        />
      )}
    </div>
  )
}
