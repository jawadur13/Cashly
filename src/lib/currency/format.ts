import { getCurrency, MINOR_UNITS_PER_MAJOR } from './currencies'
import { fromMinorUnits } from '../money'

/** The true minus sign: same width as +, and read correctly by screen readers. */
export const MINUS = '−'

export interface MoneyFormatOptions {
  /**
   * `auto` (default): whole amounts show no decimals, anything with paisa
   * shows exactly two — ৳3,000 and ৳1,626.40, never ৳1,626.4.
   * `always`: two decimals, for columns where decimals must line up.
   */
  decimals?: 'auto' | 'always'
}

function fractionDigits(minorAmount: number, options: MoneyFormatOptions): number {
  if (options.decimals === 'always') return 2
  return minorAmount % MINOR_UNITS_PER_MAJOR === 0 ? 0 : 2
}

function numberFormat(currencyCode: string, digits: number): Intl.NumberFormat | null {
  try {
    return new Intl.NumberFormat(getCurrency(currencyCode).locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
  } catch {
    // Unknown or non-ISO currency code — Intl rejects it.
    return null
  }
}

/**
 * Formats an amount held in whole minor units (paisa/cents).
 *
 * The parameter is minor units, not taka. The old `formatCurrency(major)` was
 * renamed rather than reused so that every call site had to be revisited when
 * storage moved to minor units — a missed one is a silent 100x error.
 */
export function formatMoney(minorAmount: number, currencyCode: string, options: MoneyFormatOptions = {}): string {
  const digits = fractionDigits(minorAmount, options)
  const value = fromMinorUnits(minorAmount)
  const nf = numberFormat(currencyCode, digits)
  if (nf) return nf.format(value).replace('-', MINUS)
  const currency = getCurrency(currencyCode)
  const abs = Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
  return `${value < 0 ? MINUS : ''}${currency.symbol}${abs}`
}

/**
 * The same amount split for display: the currency marker and the figure, so the
 * marker can be set smaller and lighter than the number.
 */
export function moneyParts(
  minorAmount: number,
  currencyCode: string,
  options: MoneyFormatOptions = {}
): { sign: string; currency: string; number: string; currencyFirst: boolean } {
  const digits = fractionDigits(minorAmount, options)
  const nf = numberFormat(currencyCode, digits)
  const sign = minorAmount < 0 ? MINUS : ''
  const value = Math.abs(fromMinorUnits(minorAmount))
  if (!nf) {
    return {
      sign,
      currency: getCurrency(currencyCode).symbol,
      number: value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits }),
      currencyFirst: true,
    }
  }
  const parts = nf.formatToParts(value)
  const currencyIndex = parts.findIndex((p) => p.type === 'currency')
  const firstDigit = parts.findIndex((p) => p.type === 'integer')
  const number = parts
    .filter((p) => ['integer', 'group', 'decimal', 'fraction'].includes(p.type))
    .map((p) => p.value)
    .join('')
  return {
    sign,
    currency: currencyIndex >= 0 ? parts[currencyIndex].value : '',
    number,
    currencyFirst: currencyIndex >= 0 && currencyIndex < firstDigit,
  }
}

/** Formats a minor-unit amount with an explicit sign for its direction. */
export function formatSignedMoney(
  minorAmount: number,
  currencyCode: string,
  type: 'income' | 'expense' | 'exchange' | 'give' | 'take',
  options: MoneyFormatOptions = {}
): string {
  const formatted = formatMoney(Math.abs(minorAmount), currencyCode, options)
  if (type === 'income' || type === 'take') return `+${formatted}`
  if (type === 'expense' || type === 'give') return `${MINUS}${formatted}`
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

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${formatDate(d)}, ${formatTime(d)}`
}

/** Local calendar day key, for grouping lists by day. */
export function dayKey(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "Today", "Yesterday", "Mon, 14 Oct", or with the year when it isn't this year. */
export function formatDayHeading(date: string | Date, now: Date = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const key = dayKey(d)
  if (key === dayKey(now)) return 'Today'
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (key === dayKey(yesterday)) return 'Yesterday'
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  })
}

/** Short figure for chart axes: 85000_00 → "85K". No currency, no decimals beyond one. */
export function formatCompact(minorAmount: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(fromMinorUnits(minorAmount))
}
