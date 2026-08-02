'use client'

import { formatCurrency } from '@/lib/currency/format'
import { convertCurrency } from '@/lib/currency/currencies'
import { useExchangeRates } from '@/hooks/use-exchange-rates'
import { useBalanceVisibility } from '@/providers/balance-visibility-provider'
import { MaskedAmount } from '@/components/ui/masked-amount'
import { AccountIcon } from '@/components/ui/category-icon'
import { ACCOUNT_TYPE_LABELS } from '@/lib/constants'
import type { Account } from '@/lib/types'

interface AccountCardProps {
  account: Account
  balance?: number
  defaultCurrency?: string
  onClick?: () => void
  /** Hide the balance value (used on Home; the Accounts page shows real amounts). */
  maskable?: boolean
}

export function AccountCard({ account, balance = 0, defaultCurrency, onClick, maskable = false }: AccountCardProps) {
  const { rates } = useExchangeRates()
  const { hidden } = useBalanceVisibility()
  const masked = maskable && hidden
  const showEquivalent = defaultCurrency && defaultCurrency !== account.currency
  const equivalent = showEquivalent ? convertCurrency(balance, account.currency, defaultCurrency, rates) : null

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
      <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-text-primary">
        <span className="block">
          <MaskedAmount amount={balance} currency={account.currency} masked={masked} />
        </span>
        {showEquivalent && equivalent !== null && (
          <span className="block text-xs font-normal text-text-tertiary">
            ≈ {masked ? '••••••' : formatCurrency(equivalent, defaultCurrency)}
          </span>
        )}
      </span>
    </button>
  )
}
