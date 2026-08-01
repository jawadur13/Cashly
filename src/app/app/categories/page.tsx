'use client'

import { useState } from 'react'
import { Plus, FolderKanban, Trash2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { CategoryForm } from '@/components/categories/category-form'
import { useCategories } from '@/hooks/use-categories'
import { useToast } from '@/providers/toast-provider'
import { CategoryIcon } from '@/components/ui/category-icon'
import { cn } from '@/lib/utils'
import type { Category, TransactionType } from '@/lib/types'

function CategoryRow({
  category,
  onDelete,
}: {
  category: Category
  onDelete: () => void
}) {
  return (
    <div className="group flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-3.5 py-2.5">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          category.type === 'income' ? 'bg-income-soft text-income' : 'bg-expense-soft text-expense'
        )}
      >
        <CategoryIcon name={category.icon} className="size-4.5" />
      </span>
      <span className="flex-1 text-sm font-medium text-text-primary">{category.name}</span>
      {category.isCustom ? (
        <button
          onClick={onDelete}
          aria-label={`Delete ${category.name}`}
          className="flex size-8 items-center justify-center rounded-full text-text-tertiary hover:bg-surface-hover hover:text-expense"
        >
          <Trash2 className="size-4" />
        </button>
      ) : (
        <span title="Built-in category" className="text-text-tertiary">
          <Lock className="size-3.5" />
        </span>
      )}
    </div>
  )
}

export default function CategoriesPage() {
  const { categories, loading, add, remove } = useCategories()
  const { toast } = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const [busy, setBusy] = useState(false)

  const grouped: Record<TransactionType, Category[]> = {
    income: categories.filter((c) => c.type === 'income'),
    expense: categories.filter((c) => c.type === 'expense'),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Categories</h1>
          <p className="text-sm text-text-secondary">Organize your money</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="size-5" /> Add
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-11 rounded-[var(--radius-md)]" />
          <Skeleton className="h-11 rounded-[var(--radius-md)]" />
        </div>
      ) : (
        <>
          {(['expense', 'income'] as TransactionType[]).map((type) => (
            <section key={type} className="space-y-2">
              <h2 className="text-sm font-semibold text-text-primary">
                {type === 'expense' ? 'Expense' : 'Income'}
              </h2>
              {grouped[type].length === 0 ? (
                <p className="text-sm text-text-tertiary">No {type} categories yet.</p>
              ) : (
                <div className="space-y-2">
                  {grouped[type].map((category) => (
                    <CategoryRow
                      key={category.$id}
                      category={category}
                      onDelete={() => setDeleting(category)}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
          {categories.length === 0 && (
            <EmptyState
              icon={<FolderKanban className="size-6" />}
              title="No categories"
              description="Create your first category to classify transactions."
              action={<Button onClick={() => setFormOpen(true)}>Add category</Button>}
            />
          )}
        </>
      )}

      <Sheet open={formOpen} onClose={() => setFormOpen(false)} title="Add category">
        <CategoryForm
          submitLabel="Add category"
          onCancel={() => setFormOpen(false)}
          onSubmit={async (values) => {
            await add(values)
            toast('Category added', 'success')
            setFormOpen(false)
          }}
        />
      </Sheet>

      <Sheet open={!!deleting} onClose={() => setDeleting(null)} title="Delete category">
        <p className="mb-4 text-sm text-text-secondary">
          Delete <span className="font-medium text-text-primary">{deleting?.name}</span>? Existing transactions keep
          their category.
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
                toast('Category deleted', 'success')
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
