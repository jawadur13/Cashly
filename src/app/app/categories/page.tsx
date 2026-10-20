'use client'

import { useState } from 'react'
import { FolderKanban, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { ListSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { IconTile, ListGroup, ListRow, SectionHeader } from '@/components/ui/list'
import { CategoryForm } from '@/components/categories/category-form'
import { CategoryIcon } from '@/components/ui/category-icon'
import { categoryUsage } from '@/lib/activity'
import { useCategories } from '@/hooks/use-categories'
import { useToast } from '@/providers/toast-provider'
import { useAllTransactions } from '@/providers/all-transactions-provider'
import type { Category } from '@/lib/types'

type Tab = 'expense' | 'income'

export default function CategoriesPage() {
  const { categories, loading, error, refresh, add, remove } = useCategories()
  const { transactions } = useAllTransactions()
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('expense')
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const [busy, setBusy] = useState(false)

  const usage = categoryUsage(transactions, tab)
  const inTab = categories.filter((c) => c.type === tab)
  const custom = inTab.filter((c) => c.isCustom).sort((a, b) => a.name.localeCompare(b.name))
  const builtIn = inTab.filter((c) => !c.isCustom).sort((a, b) => (usage.get(b.$id) ?? 0) - (usage.get(a.$id) ?? 0) || a.name.localeCompare(b.name))
  const deletingUses = deleting ? transactions.filter((t) => t.categoryId === deleting.$id).length : 0

  const used = (c: Category) => {
    const n = usage.get(c.$id) ?? 0
    return n === 0 ? 'Not used yet' : `Used ${n} time${n === 1 ? '' : 's'}`
  }
  const tile = (c: Category) => (
    <IconTile tone={c.type === 'income' ? 'income' : 'expense'}>
      <CategoryIcon name={c.icon} />
    </IconTile>
  )

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Categories"
        subtitle="How your money is grouped"
        actions={
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="size-4" /> Add
          </Button>
        }
      />
      <SegmentedControl
        label="Category type"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'expense', label: 'Expense' },
          { value: 'income', label: 'Income' },
        ]}
      />

      {loading ? (
        <ListSkeleton rows={6} />
      ) : error ? (
        <ErrorState what="your categories" error={error} onRetry={refresh} />
      ) : inTab.length === 0 ? (
        <EmptyState
          icon={<FolderKanban />}
          title={`No ${tab} categories`}
          description="Create one to group your transactions."
          action={<Button onClick={() => setFormOpen(true)}>Add a category</Button>}
        />
      ) : (
        <>
          {custom.length > 0 && (
            <section aria-label="Your categories">
              <SectionHeader title="Yours" />
              <ListGroup>
                {custom.map((c) => (
                  <ListRow key={c.$id} onClick={() => setDeleting(c)} leading={tile(c)} title={c.name} subtitle={used(c)} chevron aria-label={`${c.name}, ${used(c)}. Open to delete.`} />
                ))}
              </ListGroup>
            </section>
          )}
          <section aria-label="Built-in categories">
            <SectionHeader title="Built-in" />
            <ListGroup>
              {builtIn.map((c) => (
                <ListRow
                  key={c.$id}
                  leading={tile(c)}
                  title={c.name}
                  subtitle={used(c)}
                  trailing={<span className="rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-medium text-text-tertiary">Built-in</span>}
                />
              ))}
            </ListGroup>
          </section>
        </>
      )}

      <Sheet open={formOpen} onClose={() => setFormOpen(false)} title="Add category">
        <CategoryForm
          defaultType={tab}
          submitLabel="Add category"
          onCancel={() => setFormOpen(false)}
          onSubmit={async (values) => {
            await add(values)
            toast(`${values.name} added`, 'success')
            setTab(values.type === 'income' ? 'income' : 'expense')
            setFormOpen(false)
          }}
        />
      </Sheet>

      <Sheet open={!!deleting} onClose={() => setDeleting(null)} title={`Delete ${deleting?.name ?? 'category'}?`}>
        <p className="mb-5 text-sm text-text-secondary">
          {deletingUses > 0
            ? `${deletingUses} transaction${deletingUses === 1 ? ' uses' : 's use'} this category. They'll stay, and show as Uncategorized.`
            : 'No transactions use this category.'}
        </p>
        <div className="flex gap-2">
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
                toast(`${deleting.name} deleted`, 'success')
                setDeleting(null)
              } catch {
                toast("Couldn't delete this category. Please try again.", 'error')
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
