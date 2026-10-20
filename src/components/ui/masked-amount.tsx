'use client'

import { Amount } from './amount'

interface MaskedAmountProps {
  amount: number
  currency: string
  masked?: boolean
  className?: string
}

/** Kept for existing call sites; renders through Amount. */
export function MaskedAmount({ amount, currency, masked = false, className }: MaskedAmountProps) {
  return <Amount value={amount} currency={currency} masked={masked} className={className} />
}
