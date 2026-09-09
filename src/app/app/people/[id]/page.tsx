'use client'

import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, ArrowUpRight, ArrowDownRight, Share2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TransactionList } from '@/components/transactions/transaction-list'
import { Loader } from '@/components/ui/loader'
import { formatMoney } from '@/lib/currency/format'
import { useAuth } from '@/providers/auth-provider'
import { useSettings } from '@/providers/settings-provider'
import { useToast } from '@/providers/toast-provider'
import { useCategories } from '@/hooks/use-categories'
import { useAccounts } from '@/hooks/use-accounts'
import { usePeople } from '@/hooks/use-people'
import { generateShareToken, removeShareToken } from '@/lib/appwrite/collections'
import { useAllTransactions } from '@/providers/all-transactions-provider'

export default function PersonDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const { defaultCurrency } = useSettings()
  const { categories } = useCategories()
  const { accounts } = useAccounts()
  const { people, loading: peopleLoading } = usePeople()
  const { toast } = useToast()
  const { transactions: allTransactions, loading } = useAllTransactions()
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
        token = await generateShareToken(person.$id, person.name, user?.name ?? '', user?.$id ?? '', defaultCurrency)
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

  const transactions = useMemo(
    () =>
      allTransactions
        .filter((t) => t.personId === params.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [allTransactions, params.id]
  )

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

        <section className="hero-panel card-lift rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-md)] md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">{person.name}</h1>
              <div className="mt-2 break-words text-2xl font-bold tabular-nums tracking-tight text-white">
          {person.balance === 0 ? formatMoney(0, defaultCurrency) : formatMoney(person.balance, defaultCurrency)}
        </div>
        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/85">
          {person.status === 'they-owe' && <><ArrowUpRight className="size-3.5" /> They owe you</>}
          {person.status === 'you-owe' && <><ArrowDownRight className="size-3.5" /> You owe them</>}
          {person.status === 'settled' && 'Settled'}
        </p>
        {person.note && <p className="mt-2 text-sm text-white/70">{person.note}</p>}
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
