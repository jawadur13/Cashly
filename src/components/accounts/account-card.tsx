'use client'

import { formatCurrency } from '@/lib/currency/format'
import { AccountIcon } from '@/components/ui/category-icon'
import { ACCOUNT_TYPE_LABELS } from '@/lib/constants'
import type { Account } from '@/lib/types'

interface AccountCardProps {
  account: Account
  balance?: number
  onClick?: () => void
}

export function AccountCard({ account, balance = 0, onClick }: AccountCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-3.5 py-3 text-left shadow-[var(--shadow-sm)] transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
        <AccountIcon name={account.type} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-medium text-text-primary">{account.name}</span>
        <span className="block text-xs text-text-secondary">{ACCOUNT_TYPE_LABELS[account.type]}</span>
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-text-primary">
        {formatCurrency(balance, account.currency)}
      </span>
    </button>
  )
}
