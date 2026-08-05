'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, ArrowUpRight, ArrowDownRight, Share2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TransactionList } from '@/components/transactions/transaction-list'
import { Loader } from '@/components/ui/loader'
import { formatCurrency } from '@/lib/currency/format'
import { useAuth } from '@/providers/auth-provider'
import { useSettings } from '@/providers/settings-provider'
import { useToast } from '@/providers/toast-provider'
import { useCategories } from '@/hooks/use-categories'
import { useAccounts } from '@/hooks/use-accounts'
import { usePeople } from '@/hooks/use-people'
import { listTransactions, generateShareToken, removeShareToken } from '@/lib/appwrite/collections'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/lib/types'

export default function PersonDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const { defaultCurrency } = useSettings()
  const { categories } = useCategories()
  const { accounts } = useAccounts()
  const { people, loading: peopleLoading } = usePeople()
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareToken, setShareToken] = useState<string | null>(null)

  const person = useMemo(() => people.find((p) => p.$id === params.id), [people, params.id])

  async function handleShare() {
    if (!person) return
    setSharing(true)
    try {
      let token = person.shareToken || shareToken
      if (!token) {
        token = await generateShareToken(person.$id, person.name, user?.name ?? '', user?.$id ?? '', transactions)
        setShareToken(token)
      }
      const url = `${window.location.origin}/share/${token}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast('Share link copied to clipboard', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('Failed to generate share link', 'error')
    } finally {
      setSharing(false)
    }
  }

  async function handleRemoveShare() {
    if (!person) return
    try {
      await removeShareToken(person.$id, user?.$id ?? '')
      setShareToken(null)
      toast('Share link removed', 'success')
    } catch {
      toast('Failed to remove share link', 'error')
    }
  }

  useEffect(() => {
    if (!user || !params.id) return
    let active = true
    setLoading(true)
    const PAGE_SIZE = 100
    ;(async () => {
      const all: Transaction[] = []
      let offset = 0
      while (true) {
        const res = await listTransactions({ userId: user.$id, personId: params.id, limit: PAGE_SIZE, offset })
        all.push(...res.documents)
        offset += res.documents.length
        if (res.documents.length < PAGE_SIZE) break
      }
      if (active) setTransactions(all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
      if (active) setLoading(false)
    })()
    return () => { active = false }
  }, [user, params.id])

  if (peopleLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (!person) {
    return (
      <div className="space-y-5">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary">
          <ChevronLeft className="size-4" /> Back
        </button>
        <p className="text-sm text-text-tertiary">Person not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <button onClick={() => router.push('/app/people')} className="flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary">
        <ChevronLeft className="size-4" /> Back
      </button>

        <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-semibold text-text-primary">{person.name}</h1>
              <div className={cn(
          'mt-2 text-2xl font-bold tabular-nums tracking-tight',
          person.balance > 0 && 'text-income',
          person.balance < 0 && 'text-expense',
          person.balance === 0 && 'text-text-primary'
        )}>
          {person.balance === 0 ? formatCurrency(0, defaultCurrency) : formatCurrency(person.balance, defaultCurrency)}
        </div>
        <p className={cn(
          'mt-1 flex items-center gap-1 text-sm',
          person.status === 'they-owe' && 'text-income',
          person.status === 'you-owe' && 'text-expense',
          person.status === 'settled' && 'text-text-tertiary'
        )}>
          {person.status === 'they-owe' && <><ArrowUpRight className="size-4" /> They owe you</>}
          {person.status === 'you-owe' && <><ArrowDownRight className="size-4" /> You owe them</>}
          {person.status === 'settled' && 'Settled'}
        </p>
        {person.note && <p className="mt-2 text-sm text-text-secondary">{person.note}</p>}
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                size="sm"
                variant="secondary"
                loading={sharing}
                onClick={handleShare}
                aria-label="Share summary"
              >
                {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
                {copied ? 'Copied' : 'Share'}
              </Button>
              {(person.shareToken || shareToken) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRemoveShare}
                  aria-label="Remove share link"
                >
                  Stop
                </Button>
              )}
            </div>
          </div>
        </section>

      <TransactionList
        transactions={transactions}
        categories={categories}
        accounts={accounts}
        people={people}
        loading={loading}
        onSelect={(id) => router.push(`/app/transactions/${id}`)}
        emptyTitle="No transactions yet"
        emptyDescription="No give or take recorded with this person."
      />
    </div>
  )
}
