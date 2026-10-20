'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { CATEGORY_ICONS } from '@/lib/icons'
import { cn } from '@/lib/utils'
import type { Category, TransactionType } from '@/lib/types'

interface CategoryFormProps {
  initial?: Category
  /** Pre-selected type when creating, e.g. from inside an expense. */
  defaultType?: TransactionType
  onSubmit: (values: { type: TransactionType; name: string; icon: string }) => Promise<void>
  onCancel: () => void
  submitLabel: string
}

export function CategoryForm({ initial, defaultType, onSubmit, onCancel, submitLabel }: CategoryFormProps) {
  const [type, setType] = useState<TransactionType>(initial?.type ?? defaultType ?? 'expense')
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? 'receipt')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Enter a category name')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit({ type, name: name.trim(), icon })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <SegmentedControl
        value={type}
        onChange={setType}
        options={[
          { value: 'income', label: 'Income' },
          { value: 'expense', label: 'Expense' },
        ]}
      />
      <Input
        name="name"
        label="Category name"
        placeholder="e.g. Groceries, Salary"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error ?? undefined}
      />
      <div>
        <span className="mb-2 block text-sm font-medium text-text-secondary">Icon</span>
        <div className="grid max-h-56 grid-cols-5 gap-2 overflow-y-auto rounded-[var(--radius-lg)] bg-surface-sunken p-2.5 sm:grid-cols-8">
          {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setIcon(key)}
              aria-pressed={icon === key}
              aria-label={key.replace(/-/g, ' ')}
              className={cn(
                'pressable flex aspect-square min-h-11 w-full items-center justify-center rounded-[var(--radius-md)]',
                icon === key
                  ? 'bg-primary text-on-primary shadow-[var(--shadow-sm)]'
                  : 'bg-surface text-text-secondary hover:text-text-primary'
              )}
            >
              <Icon className="size-[1.15rem]" />
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <Button variant="secondary" fullWidth onClick={onCancel}>Cancel</Button>
        <Button type="submit" fullWidth loading={submitting}>{submitLabel}</Button>
      </div>
    </form>
  )
}
