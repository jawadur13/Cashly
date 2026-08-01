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
  onSubmit: (values: { type: TransactionType; name: string; icon: string }) => Promise<void>
  onCancel: () => void
  submitLabel: string
}

export function CategoryForm({ initial, onSubmit, onCancel, submitLabel }: CategoryFormProps) {
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense')
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
      <SegmentedControl value={type} onChange={setType} />
      <Input
        name="name"
        label="Category name"
        placeholder="e.g. Groceries, Salary"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error ?? undefined}
      />
      <div>
        <span className="mb-1.5 block text-[0.8125rem] font-medium text-text-secondary">Icon</span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setIcon(key)}
              aria-pressed={icon === key}
              className={cn(
                'flex size-10 items-center justify-center rounded-full border transition-colors',
                icon === key
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-border bg-surface text-text-secondary hover:bg-surface-hover'
              )}
            >
              <Icon className="size-5" />
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel}>Cancel</Button>
        <Button type="submit" fullWidth loading={submitting}>{submitLabel}</Button>
      </div>
    </form>
  )
}
