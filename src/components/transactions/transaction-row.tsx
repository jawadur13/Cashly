'use client'

import { ArrowLeftRight, HandCoins, Handshake } from 'lucide-react'
import { Amount } from '@/components/ui/amount'
import { CategoryIcon } from '@/components/ui/category-icon'
import { IconTile, ListRow } from '@/components/ui/list'
import { formatDateTime, formatMoney, formatTime } from '@/lib/currency/format'
import { readAmountMinor, readFromAmountMinor, readToAmountMinor } from '@/lib/money'
import type { Transaction } from '@/lib/types'

interface TransactionRowProps {
  transaction: Transaction
  category?: { $id: string; name: string; icon?: string }
  /** Source account for income/expense, or the from-account for transfers. */
  account?: { $id: string; name: string; currency?: string }
  /** Destination account, only meaningful for transfers. */
  toAccount?: { $id: string; name: string; currency?: string }
  person?: { $id: string; name: string }
  /** Inside a day group the date is in the heading, so only the time is shown. */
  timeOnly?: boolean
  /** Hide the account on screens already filtered to one. */
  hideAccount?: boolean
}

/** User-facing names for the stored types. Stored values never change. */
export const TYPE_LABELS: Record<Transaction['type'], string> = {
  income: 'Income',
  expense: 'Expense',
  exchange: 'Transfer',
  give: 'Give',
  take: 'Get',
}

export function TransactionRow({ transaction: t, category, account, toAccount, person, timeOnly, hideAccount }: TransactionRowProps) {
  const when = timeOnly ? formatTime(t.date) : formatDateTime(t.date)
  const href = `/app/transactions/${t.$id}`

  if (t.type === 'exchange') {
    const fromCurrency = account?.currency ?? t.currency
    const toCurrency = toAccount?.currency ?? t.currency
    const sent = readFromAmountMinor(t)
    const received = readToAmountMinor(t)
    // Each leg is in its own account's currency; only same-currency legs can be
    // subtracted into a fee or gain.
    let detail: string | null = null
    if (fromCurrency !== toCurrency) detail = `→ ${formatMoney(received, toCurrency)}`
    else if (received < sent) detail = `Fee ${formatMoney(sent - received, fromCurrency)}`
    else if (received > sent) detail = `Gain ${formatMoney(received - sent, fromCurrency)}`
    return (
      <ListRow
        href={href}
        leading={<IconTile tone="transfer"><ArrowLeftRight /></IconTile>}
        title={`${account?.name ?? 'Account'} → ${toAccount?.name ?? 'Account'}`}
        subtitle={[t.note || 'Transfer', when].join(' · ')}
        trailing={<Amount value={sent} currency={fromCurrency} tone="transfer" />}
        trailingSub={detail}
        chevron={false}
      />
    )
  }

  if (t.type === 'give' || t.type === 'take') {
    const gave = t.type === 'give'
    return (
      <ListRow
        href={href}
        leading={<IconTile tone={gave ? 'expense' : 'income'}>{gave ? <HandCoins /> : <Handshake />}</IconTile>}
        title={`${gave ? 'Gave to' : 'Got from'} ${person?.name ?? 'someone'}`}
        subtitle={[t.note, !hideAccount && account?.name, when].filter(Boolean).join(' · ')}
        trailing={
          <Amount value={gave ? -readAmountMinor(t) : readAmountMinor(t)} currency={t.currency} tone={gave ? 'expense' : 'income'} showPlus />
        }
        chevron={false}
      />
    )
  }

  const income = t.type === 'income'
  const categoryName = category?.name ?? 'Uncategorized'
  const headline = t.payee || t.note
  const subtitle = [headline ? categoryName : t.note, !hideAccount && account?.name, when].filter(Boolean).join(' · ')
  return (
    <ListRow
      href={href}
      leading={
        <IconTile tone={income ? 'income' : 'expense'}>
          <CategoryIcon name={category?.icon} />
        </IconTile>
      }
      title={headline || categoryName}
      subtitle={subtitle}
      trailing={
        <Amount value={income ? readAmountMinor(t) : -readAmountMinor(t)} currency={t.currency} tone={income ? 'income' : 'neutral'} showPlus />
      }
      chevron={false}
    />
  )
}
