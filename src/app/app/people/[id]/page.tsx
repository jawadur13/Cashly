'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Check, HandCoins, Handshake, Link2, Link2Off, Pencil, Scale, Trash2, UserX } from 'lucide-react'
import { Amount } from '@/components/ui/amount'
import { Button, BUTTON_BASE, BUTTON_SIZES, BUTTON_VARIANTS } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Sheet } from '@/components/ui/sheet'
import { SectionHeader } from '@/components/ui/list'
import { ListSkeleton, Skeleton } from '@/components/ui/skeleton'
import { TransactionList } from '@/components/transactions/transaction-list'
import { useQuickAdd } from '@/components/transactions/quick-add'
import { initials } from '@/components/nav/nav-config'
import { sortNewestFirst } from '@/lib/activity'
import { generateShareToken, removeShareToken } from '@/lib/supabase/data'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'
import { useSettings } from '@/providers/settings-provider'
import { useToast } from '@/providers/toast-provider'
import { usePeople } from '@/hooks/use-people'
import { useAllTransactions } from '@/providers/all-transactions-provider'

export default function PersonDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const { defaultCurrency } = useSettings()
  const { people, loading: peopleLoading, refresh: refreshPeople, update, remove } = usePeople()
  const { transactions: all, loading } = useAllTransactions()
  const { open } = useQuickAdd()
  const { toast } = useToast()
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmStop, setConfirmStop] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const person = people.find((p) => p.$id === params.id)
  const history = sortNewestFirst(all.filter((t) => t.personId === params.id))

  if (peopleLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Skeleton className="h-52 rounded-[var(--radius-xl)]" />
        <ListSkeleton rows={4} />
      </div>
    )
  }

  if (!person) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={<UserX />}
          title="Person not found"
          description="They may have been deleted."
          action={
            <Link href="/app/people" className={cn(BUTTON_BASE, BUTTON_VARIANTS.primary, BUTTON_SIZES.md)}>
              Back to People
            </Link>
          }
        />
      </div>
    )
  }

  const p = person
  // balance < 0: they owe you; > 0: you owe them (see usePeople). Shown as an
  // absolute amount with the direction in words — display only.
  const owesYou = p.balance < 0
  const settled = p.balance === 0
  const amount = Math.abs(p.balance)
  const shared = Boolean(p.shareToken)

  async function shareLink() {
    setSharing(true)
    try {
      let token = p.shareToken
      if (!token) {
        token = await generateShareToken(p.$id, p.name, user?.name ?? '', user?.$id ?? '', defaultCurrency)
        await refreshPeople()
      }
      const url = `${window.location.origin}/share/${token}`
      if (navigator.share) {
        await navigator.share({ title: `${p.name} · Cashly`, text: `Our balance on Cashly`, url }).catch(() => {})
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        toast('Link copied. Anyone with it can see your give/get history with ' + p.name + '.', 'success')
        setTimeout(() => setCopied(false), 2500)
      }
    } catch {
      toast("Couldn't create the share link. Please try again.", 'error')
    } finally {
      setSharing(false)
    }
  }

  async function stopSharing() {
    setBusy(true)
    try {
      await removeShareToken(p.$id, user?.$id ?? '')
      await refreshPeople()
      setConfirmStop(false)
      toast('Sharing stopped. The old link no longer works.', 'success')
    } catch {
      toast("Couldn't stop sharing. Please try again.", 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="hero-panel gold-hairline overflow-hidden rounded-[var(--radius-xl)] p-5 shadow-[var(--shadow-lg)] md:p-7">
        <div className="flex items-center gap-3.5">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/12 text-lg font-semibold ring-1 ring-white/20">
            {initials(p.name, '')}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">{p.name}</h1>
            {p.note && <p className="truncate text-sm text-hero-muted">{p.note}</p>}
          </div>
        </div>
        <div className="mt-6">
          <p className="text-sm font-medium text-hero-muted">
            {settled ? 'All settled' : owesYou ? `${p.name.split(' ')[0]} owes you` : `You owe ${p.name.split(' ')[0]}`}
          </p>
          <Amount
            value={amount}
            currency={defaultCurrency}
            className="mt-1 text-[2.125rem] font-semibold leading-tight tracking-tight"
            currencyClassName="text-[0.5em] font-medium opacity-70"
          />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            { label: 'Give', icon: HandCoins, onClick: () => open({ type: 'give', personId: p.$id }) },
            { label: 'Get', icon: Handshake, onClick: () => open({ type: 'take', personId: p.$id }) },
            {
              label: 'Settle up',
              icon: Scale,
              disabled: settled,
              onClick: () =>
                open({ type: owesYou ? 'take' : 'give', personId: p.$id, amountMinor: amount, note: 'Settled up' }),
            },
          ].map(({ label, icon: Icon, onClick, disabled }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              disabled={disabled}
              className="pressable flex min-h-12 items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-white/10 text-sm font-semibold ring-1 ring-inset ring-white/15 hover:bg-white/15 disabled:opacity-40"
            >
              <Icon className="size-4" aria-hidden /> {label}
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={shareLink} loading={sharing}>
          {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
          {shared ? 'Share link' : 'Create share link'}
        </Button>
        {shared && (
          <Button variant="secondary" size="sm" onClick={() => setConfirmStop(true)}>
            <Link2Off className="size-4" /> Stop sharing
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={() => { setName(p.name); setNote(p.note); setEditOpen(true) }}>
          <Pencil className="size-4" /> Edit
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setDeleteOpen(true)} className="text-expense">
          <Trash2 className="size-4" /> Delete
        </Button>
      </div>

      <section aria-label="History">
        <SectionHeader title={`History · ${history.length}`} />
        <TransactionList
          transactions={history}
          loading={loading}
          empty={
            <EmptyState
              icon={<HandCoins />}
              title={`Nothing with ${p.name.split(' ')[0]} yet`}
              description="Record money you give or get, and the balance keeps itself."
              action={<Button onClick={() => open({ type: 'give', personId: p.$id })}>Record a give</Button>}
            />
          }
        />
      </section>

      <Sheet open={confirmStop} onClose={() => setConfirmStop(false)} title="Stop sharing?">
        <p className="mb-5 text-sm text-text-secondary">
          The link you shared with {p.name} stops working straight away. You can create a new one later.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={() => setConfirmStop(false)}>Keep sharing</Button>
          <Button variant="danger" fullWidth loading={busy} onClick={stopSharing}>Stop sharing</Button>
        </div>
      </Sheet>

      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit person">
        <form
          className="space-y-4"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault()
            if (!name.trim()) return
            setBusy(true)
            try {
              await update(p.$id, { name: name.trim(), note: note.trim() })
              setEditOpen(false)
              toast('Saved', 'success')
            } catch {
              toast("Couldn't save. Please try again.", 'error')
            } finally {
              setBusy(false)
            }
          }}
        >
          <Input name="personName" label="Name" value={name} onChange={(e) => setName(e.target.value)} error={name.trim() ? undefined : 'Enter a name'} />
          <Input name="personNote" label="Note (optional)" placeholder="e.g. roommate, office" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" fullWidth loading={busy} disabled={!name.trim()}>Save</Button>
          </div>
        </form>
      </Sheet>

      <Sheet open={deleteOpen} onClose={() => setDeleteOpen(false)} title={`Delete ${p.name}?`}>
        {history.length > 0 ? (
          <>
            <p className="mb-5 text-sm text-text-secondary">
              {p.name} has {history.length} transaction{history.length === 1 ? '' : 's'}. People with history can&apos;t be
              deleted, so your give and get records stay complete.
            </p>
            <Button variant="secondary" fullWidth onClick={() => setDeleteOpen(false)}>Got it</Button>
          </>
        ) : (
          <>
            <p className="mb-5 text-sm text-text-secondary">They have no transactions. Any share link stops working.</p>
            <div className="flex gap-2">
              <Button variant="secondary" fullWidth onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button
                variant="danger"
                fullWidth
                loading={busy}
                onClick={async () => {
                  setBusy(true)
                  try {
                    await remove(p.$id)
                    toast(`${p.name} deleted`, 'success')
                    router.replace('/app/people')
                  } catch {
                    toast("Couldn't delete. Please try again.", 'error')
                    setBusy(false)
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </>
        )}
      </Sheet>
    </div>
  )
}
