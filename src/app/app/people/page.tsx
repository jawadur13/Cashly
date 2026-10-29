'use client'

import { useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { Amount } from '@/components/ui/amount'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet } from '@/components/ui/sheet'
import { ListSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import { ListGroup, ListRow, SectionHeader } from '@/components/ui/list'
import { initials } from '@/components/nav/nav-config'
import { HelpTip } from '@/components/help/help-tip'
import { personRecency } from '@/lib/activity'
import { formatDate } from '@/lib/currency/format'
import { cn } from '@/lib/utils'
import { useSettings } from '@/providers/settings-provider'
import { usePeople, type PersonWithBalance } from '@/hooks/use-people'
import { useToast } from '@/providers/toast-provider'
import { useAllTransactions } from '@/providers/all-transactions-provider'

function Avatar({ person }: { person: PersonWithBalance }) {
  return (
    <span
      className={cn(
        'flex size-10 items-center justify-center rounded-full text-sm font-semibold',
        person.status === 'they-owe' ? 'bg-income-soft text-income' : person.status === 'you-owe' ? 'bg-expense-soft text-expense' : 'bg-surface-sunken text-text-secondary'
      )}
      aria-hidden
    >
      {initials(person.name, '')}
    </span>
  )
}

export default function PeoplePage() {
  const { defaultCurrency } = useSettings()
  const { people, loading, error, refresh, add } = usePeople()
  const { transactions } = useAllTransactions()
  const { toast } = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)

  const recency = personRecency(transactions)
  // balance < 0: they owe you; > 0: you owe them (see usePeople). Display only.
  const owedToYou = people.filter((p) => p.balance < 0).reduce((s, p) => s - p.balance, 0)
  const youOwe = people.filter((p) => p.balance > 0).reduce((s, p) => s + p.balance, 0)
  const open = people.filter((p) => p.balance !== 0).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
  const settled = people.filter((p) => p.balance === 0).sort((a, b) => a.name.localeCompare(b.name))

  const row = (p: PersonWithBalance) => {
    const last = recency.get(p.$id)
    return (
      <ListRow
        key={p.$id}
        href={`/app/people/${p.$id}`}
        leading={<Avatar person={p} />}
        title={p.name}
        subtitle={p.note || (last ? `Last activity ${formatDate(new Date(last))}` : 'No activity yet')}
        trailing={
          p.balance === 0 ? (
            <span className="text-sm font-medium text-text-tertiary">Settled</span>
          ) : (
            <Amount value={Math.abs(p.balance)} currency={defaultCurrency} tone={p.balance < 0 ? 'income' : 'expense'} />
          )
        }
        trailingSub={p.balance < 0 ? 'owes you' : p.balance > 0 ? 'you owe' : undefined}
      />
    )
  }

  function openForm() {
    setName('')
    setNote('')
    setTouched(false)
    setFormOpen(true)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="People"
        subtitle={`${people.length} ${people.length === 1 ? 'person' : 'people'}`}
        actions={
          <Button size="sm" onClick={openForm}>
            <Plus className="size-4" /> Add
          </Button>
        }
      />

      {loading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <ErrorState what="your people" error={error} onRetry={refresh} />
      ) : people.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="Keep track of who owes whom"
          description="Add a friend, family member or colleague, then record money you give or get."
          action={<Button onClick={openForm}>Add a person</Button>}
        />
      ) : (
        <>
          {(owedToYou > 0 || youOwe > 0) && (
            <div className="relative grid grid-cols-2 divide-x divide-border rounded-[var(--radius-lg)] bg-surface py-4 text-center shadow-[var(--shadow-sm)] ring-1 ring-border">
              <span className="absolute right-3 top-3">
                <HelpTip title="Who owes whom" guide="people-balance">
                  <p>Cashly works this out from your Give and Get transactions with each person.</p>
                  <p>
                    <span className="font-semibold text-income">Owes you</span> means they owe you that amount.{' '}
                    <span className="font-semibold text-expense">You owe</span> means you owe them. Settled means you’re even.
                  </p>
                  <p>Open a person and tap Settle up to clear a balance in one step.</p>
                </HelpTip>
              </span>
              <div>
                <p className="text-xs font-medium text-text-tertiary">Owed to you</p>
                <Amount value={owedToYou} currency={defaultCurrency} tone={owedToYou ? 'income' : 'muted'} className="mt-0.5 text-lg font-semibold" />
              </div>
              <div>
                <p className="text-xs font-medium text-text-tertiary">You owe</p>
                <Amount value={youOwe} currency={defaultCurrency} tone={youOwe ? 'expense' : 'muted'} className="mt-0.5 text-lg font-semibold" />
              </div>
            </div>
          )}
          {open.length > 0 && (
            <section aria-label="Open balances">
              <SectionHeader title="Open balances" />
              <ListGroup>{open.map(row)}</ListGroup>
            </section>
          )}
          {settled.length > 0 && (
            <section aria-label="Settled">
              <SectionHeader title="Settled" />
              <ListGroup>{settled.map(row)}</ListGroup>
            </section>
          )}
        </>
      )}

      <Sheet open={formOpen} onClose={() => setFormOpen(false)} title="Add person">
        <form
          className="space-y-4"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault()
            setTouched(true)
            if (!name.trim()) return
            setBusy(true)
            try {
              await add({ name: name.trim(), note: note.trim() })
              toast(`${name.trim()} added`, 'success')
              setFormOpen(false)
            } catch {
              toast("Couldn't add this person. Please try again.", 'error')
            } finally {
              setBusy(false)
            }
          }}
        >
          <Input
            name="personName"
            label="Name"
            placeholder="e.g. Rahim"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={touched && !name.trim() ? 'Enter a name' : undefined}
          />
          <Input name="personNote" label="Note (optional)" placeholder="e.g. friend, landlord" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" fullWidth onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" fullWidth loading={busy}>Add person</Button>
          </div>
        </form>
      </Sheet>
    </div>
  )
}
