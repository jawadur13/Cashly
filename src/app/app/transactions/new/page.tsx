'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ListSkeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/ui/page-header'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { TYPE_LABELS } from '@/components/transactions/transaction-row'
import { useAccounts } from '@/hooks/use-accounts'
import { useToast } from '@/providers/toast-provider'
import type { TransactionType } from '@/lib/types'

const TYPES: TransactionType[] = ['expense', 'income', 'exchange', 'give', 'take']

function NewTransaction() {
  const router = useRouter()
  const params = useSearchParams()
  const { loading } = useAccounts()
  const { toast } = useToast()
  const typeParam = params.get('type') as TransactionType | null

  if (loading) return <ListSkeleton rows={5} />

  return (
    <TransactionForm
      variant="page"
      preset={{
        type: typeParam && TYPES.includes(typeParam) ? typeParam : undefined,
        accountId: params.get('account') ?? undefined,
        personId: params.get('person') ?? undefined,
      }}
      onCancel={() => router.back()}
      onSaved={(saved, { addAnother }) => {
        toast(`${TYPE_LABELS[saved.type]} saved`, 'success')
        if (!addAnother) router.back()
      }}
    />
  )
}

/** Deep-linkable full-page version of the quick-add sheet. */
export default function NewTransactionPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="New transaction" className="hidden md:flex" />
      <Suspense fallback={<ListSkeleton rows={5} />}>
        <NewTransaction />
      </Suspense>
    </div>
  )
}
