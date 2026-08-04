'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, Trash2, ArrowUpRight, ArrowDownRight, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency } from '@/lib/currency/format'
import { useSettings } from '@/providers/settings-provider'
import { usePeople } from '@/hooks/use-people'
import { useToast } from '@/providers/toast-provider'
import { cn } from '@/lib/utils'
import type { PersonWithBalance } from '@/hooks/use-people'

export default function PeoplePage() {
  const router = useRouter()
  const { defaultCurrency } = useSettings()
  const { people, loading, add, update, remove } = usePeople()
  const { toast } = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PersonWithBalance | null>(null)
  const [deleting, setDeleting] = useState<PersonWithBalance | null>(null)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const statusLabel = (status: string) => {
    if (status === 'they-owe') return 'Owes you'
    if (status === 'you-owe') return 'You owe'
    return 'Settled'
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">People</h1>
          <p className="text-sm text-text-secondary">{people.length} person{people.length === 1 ? '' : 's'}</p>
        </div>
        <Button onClick={() => { setEditing(null); setName(''); setNote(''); setFormOpen(true) }}>
          <Plus className="size-5" /> Add
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-[72px] rounded-[var(--radius-md)]" />
          <Skeleton className="h-[72px] rounded-[var(--radius-md)]" />
        </div>
      ) : people.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" />}
          title="No people yet"
          description="Add people you give money to or take money from."
          action={<Button onClick={() => { setEditing(null); setName(''); setNote(''); setFormOpen(true) }}>Add person</Button>}
        />
      ) : (
        <div className="space-y-2">
          {people.map((person) => (
            <div key={person.$id} className="group relative">
              <button
                onClick={() => router.push(`/app/people/${person.$id}`)}
                className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-3.5 py-3 pr-16 text-left shadow-[var(--shadow-sm)] transition-colors hover:bg-surface-hover"
              >
                <span className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-full',
                  person.status === 'they-owe' ? 'bg-income-soft text-income' : person.status === 'you-owe' ? 'bg-expense-soft text-expense' : 'bg-surface-hover text-text-tertiary'
                )}>
                  {person.status === 'they-owe' ? <ArrowUpRight className="size-5" /> : person.status === 'you-owe' ? <ArrowDownRight className="size-5" /> : <Users className="size-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.9375rem] font-medium text-text-primary">{person.name}</span>
                  <span className={cn(
                    'block text-xs font-medium',
                    person.status === 'they-owe' && 'text-income',
                    person.status === 'you-owe' && 'text-expense',
                    person.status === 'settled' && 'text-text-tertiary'
                  )}>
                    {statusLabel(person.status)}
                  </span>
                </span>
                <span className={cn(
                  'shrink-0 text-right text-sm font-semibold tabular-nums',
                  person.balance > 0 && 'text-income',
                  person.balance < 0 && 'text-expense',
                  person.balance === 0 && 'text-text-tertiary'
                )}>
                  {person.balance === 0 ? formatCurrency(0, defaultCurrency) : formatCurrency(person.balance, defaultCurrency)}
                </span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setEditing(person); setName(person.name); setNote(person.note); setFormOpen(true) }}
                aria-label={`Edit ${person.name}`}
                className="absolute right-9 top-1/2 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full text-text-tertiary hover:text-accent group-hover:flex"
              >
                <Pencil className="size-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setDeleting(person) }}
                aria-label={`Delete ${person.name}`}
                className="absolute right-3 top-1/2 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full text-text-tertiary hover:text-expense group-hover:flex"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Sheet open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit person' : 'Add person'}>
        <form className="space-y-4" noValidate onSubmit={async (e) => {
          e.preventDefault()
          if (!name.trim()) return
          setBusy(true)
          try {
            if (editing) {
              await update(editing.$id, { name: name.trim(), note: note.trim() })
              toast('Person updated', 'success')
            } else {
              await add({ name: name.trim(), note: note.trim() })
              toast('Person added', 'success')
            }
            setFormOpen(false)
          } catch {
            toast('Failed to save person. Please try again.', 'error')
          } finally {
            setBusy(false)
          }
        }}>
          <Input
            name="personName"
            label="Name"
            placeholder="e.g. Rahim"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            name="personNote"
            label="Note (optional)"
            placeholder="e.g. Friend, landlord"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" fullWidth onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" fullWidth loading={busy}>{editing ? 'Save changes' : 'Add person'}</Button>
          </div>
        </form>
      </Sheet>

      <Sheet open={!!deleting} onClose={() => setDeleting(null)} title="Delete person">
        <p className="mb-4 text-sm text-text-secondary">
          Delete <span className="font-medium text-text-primary">{deleting?.name}</span>? Existing transactions keep
          their person reference but the name will show as Unknown.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setDeleting(null)}>Cancel</Button>
          <Button
            variant="danger"
            fullWidth
            loading={busy}
            onClick={async () => {
              if (!deleting) return
              setBusy(true)
              try {
                await remove(deleting.$id)
                toast('Person deleted', 'success')
                setDeleting(null)
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
