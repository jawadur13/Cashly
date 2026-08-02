'use client'

import { formatCurrency } from '@/lib/currency/format'

interface MaskedAmountProps {
  amount: number
  currency: string
  masked?: boolean
  /** How many leading digits stay readable before the blur starts. */
  visibleDigits?: number
  className?: string
}

export function MaskedAmount({
  amount,
  currency,
  masked = false,
  visibleDigits = 2,
  className,
}: MaskedAmountProps) {
  const formatted = formatCurrency(amount, currency)

  if (!masked) {
    return <span className={className}>{formatted}</span>
  }

  let digits = 0
  let splitIndex = formatted.length
  for (let i = 0; i < formatted.length; i += 1) {
    if (/\d/.test(formatted[i])) {
      digits += 1
      if (digits === visibleDigits) {
        splitIndex = i + 1
        break
      }
    }
  }

  const visible = formatted.slice(0, splitIndex)
  const blurred = formatted.slice(splitIndex)

  return (
    <span className={className} aria-label="Hidden amount">
      <span aria-hidden="true">{visible}</span>
      {blurred && (
        <span aria-hidden="true" className="select-none blur-[6px]">
          {blurred}
        </span>
      )}
    </span>
  )
}
