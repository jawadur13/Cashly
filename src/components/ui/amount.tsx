'use client'

import { moneyParts, MINUS, type MoneyFormatOptions } from '@/lib/currency/format'
import { cn } from '@/lib/utils'

export type AmountTone = 'neutral' | 'income' | 'expense' | 'transfer' | 'muted' | 'inherit'

interface AmountProps extends MoneyFormatOptions {
  /** Whole minor units (paisa). */
  value: number
  currency: string
  /** Colour role. Default: inherit the surrounding text colour. */
  tone?: AmountTone
  /** Show + for positive values (and − for negative, always shown). */
  showPlus?: boolean
  /** Hide the figure behind a blur, keeping the currency readable. */
  masked?: boolean
  className?: string
  /** Classes for the currency marker (defaults to smaller, lighter). */
  currencyClassName?: string
}

const TONES: Record<AmountTone, string> = {
  neutral: 'text-text-primary',
  income: 'text-income',
  expense: 'text-expense',
  transfer: 'text-exchange',
  muted: 'text-text-tertiary',
  inherit: '',
}

/**
 * Every amount on screen goes through here, so signs, decimals, tabular figures
 * and the small currency marker are the same everywhere. Display only — the
 * value is minor units straight from the calculation layer.
 */
export function Amount({
  value,
  currency,
  tone = 'inherit',
  showPlus = false,
  masked = false,
  decimals,
  className,
  currencyClassName,
}: AmountProps) {
  const parts = moneyParts(value, currency, { decimals })
  const sign = parts.sign || (showPlus && value > 0 ? '+' : '')
  const marker = (
    <span className={cn('text-[0.72em] font-medium opacity-75', currencyClassName)}>{parts.currency}</span>
  )
  const spoken = `${sign === MINUS ? 'minus ' : sign === '+' ? 'plus ' : ''}${parts.number} ${currency}`

  return (
    <span
      className={cn('inline-flex items-baseline gap-[0.25em] whitespace-nowrap tabular-nums', TONES[tone], className)}
      role="text"
      aria-label={masked ? `Hidden amount in ${currency}` : spoken}
    >
      <span aria-hidden className="inline-flex items-baseline gap-[0.25em]">
        {sign && <span>{sign}</span>}
        {parts.currencyFirst && marker}
        <span className={cn(masked && 'select-none blur-[9px]')}>{masked ? '0,000.00' : parts.number}</span>
        {!parts.currencyFirst && marker}
      </span>
    </span>
  )
}
