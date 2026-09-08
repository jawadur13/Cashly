import { getCurrency } from './currencies'
import { fromMinorUnits } from '../money'

/**
 * Formats an amount held in whole minor units (paisa/cents).
 *
 * The parameter is minor units, not taka. The old `formatCurrency(major)` was
 * renamed rather than reused so that every call site had to be revisited when
 * storage moved to minor units — a missed one is a silent 100x error.
 */
export function formatMoney(minorAmount: number, currencyCode: string): string {
  const currency = getCurrency(currencyCode)
  const value = fromMinorUnits(minorAmount)
  try {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    // Unknown or non-ISO currency code — Intl rejects it, so fall back.
    return `${currency.symbol}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  }
}

/** Formats a minor-unit amount with an explicit sign for its direction. */
export function formatSignedMoney(
  minorAmount: number,
  currencyCode: string,
  type: 'income' | 'expense' | 'exchange' | 'give' | 'take'
): string {
  const formatted = formatMoney(Math.abs(minorAmount), currencyCode)
  if (type === 'income' || type === 'take') return `+${formatted}`
  if (type === 'expense' || type === 'give') return `-${formatted}`
  return formatted
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${formatDate(d)} ${d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}
