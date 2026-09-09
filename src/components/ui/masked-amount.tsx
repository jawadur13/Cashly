'use client'

import { formatMoney } from '@/lib/currency/format'

interface MaskedAmountProps {
  amount: number
  currency: string
  masked?: boolean
  className?: string
}

export function MaskedAmount({ amount, currency, masked = false, className }: MaskedAmountProps) {
  const formatted = formatMoney(amount, currency)

  if (!masked) {
    return <span className={className}>{formatted}</span>
  }

  const splitIndex = formatted.search(/\d/)
  const prefix = splitIndex === -1 ? formatted : formatted.slice(0, splitIndex)
  const number = splitIndex === -1 ? '' : formatted.slice(splitIndex)

  return (
    <span className={className} aria-label="Hidden amount">
      {prefix && <span aria-hidden="true">{prefix}</span>}
      {number && (
        <span aria-hidden="true" className="select-none blur-[8px]">
          {number}
        </span>
      )}
    </span>
  )
}
