'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { SearchX } from 'lucide-react'
import { ListSkeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { BUTTON_BASE, BUTTON_SIZES, BUTTON_VARIANTS } from '@/components/ui/button'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { useTransactionActions } from '@/hooks/use-transactions'
import { useAccounts } from '@/hooks/use-accounts'
import { useAllTransactions } from '@/providers/all-transactions-provider'
import { useToast } from '@/providers/toast-provider'
import { getTransaction } from '@/lib/supabase/data'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/lib/types'

export default function EditTransactionPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { loading: accountsLoading } = useAccounts()
  const { transactions, loading: historyLoading } = useAllTransactions()
  const { restore } = useTransactionActions()
  const { toast } = useToast()
  const cached = transactions.find((t) => t.$id === params.id) ?? null
  const [fetched, setFetched] = useState<Transaction | null>(null)
  const [state, setState] = useState<'idle' | 'missing' | 'error'>('idle')
  const [attempt, setAttempt] = useState(0)

  // Snapshot what is being edited so a background refresh doesn't reset the form.
  const [initial, setInitial] = useState<Transaction | null>(null)

  useEffect(() => {
    // Once the form has its data (or the row was just deleted here), stop fetching.
    if (cached || historyLoading || initial) return
    let active = true
    getTransaction(params.id)
      .then((t) => {
        if (active) setFetched(t)
      })
      .catch((e: Error) => {
        if (active) setState(/0 rows|not found|PGRST116/i.test(e.message) ? 'missing' : 'error')
      })
    return () => {
      active = false
    }
  }, [cached, historyLoading, initial, params.id, attempt])

  const source = cached ?? fetched
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (source && !initial) setInitial(source)
  }, [source, initial])

  const back = () => (window.history.length > 1 ? router.back() : router.push('/app/transactions'))

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Edit transaction" className="hidden md:flex" />
      {state === 'missing' ? (
        <EmptyState
          icon={<SearchX />}
          title="Transaction not found"
          description="It may have been deleted on another device."
          action={
            <Link href="/app/transactions" className={cn(BUTTON_BASE, BUTTON_VARIANTS.primary, BUTTON_SIZES.md)}>
              Back to Activity
            </Link>
          }
        />
      ) : state === 'error' ? (
        <ErrorState what="this transaction" onRetry={() => { setState('idle'); setAttempt((a) => a + 1) }} />
      ) : !initial || accountsLoading ? (
        <ListSkeleton rows={5} />
      ) : (
        <TransactionForm
          variant="page"
          initial={initial}
          onCancel={back}
          onSaved={() => {
            toast('Changes saved', 'success')
            back()
          }}
          onDeleted={(deleted) => {
            toast('Transaction deleted', 'success', {
              action: {
                label: 'Undo',
                onClick: () => {
                  restore(deleted).catch(() => toast("Couldn't restore it. Please add it again.", 'error'))
                },
              },
            })
            back()
          }}
        />
      )}
    </div>
  )
}
