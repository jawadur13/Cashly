import { MINOR_UNITS_PER_MAJOR } from './currency/currencies'
import type { Transaction } from './types'

/**
 * Money is handled in whole minor units — paisa, cents — never decimal major
 * units. 0.1 + 0.2 is not 0.3 in binary floating point, and those errors
 * accumulate across a long transaction history.
 *
 * Storage is migrating from a float `amount` to an integer `amountMinor`. Both
 * are written, and reads fall back to converting the float, so the app gives
 * identical answers before and after `scripts/migrate-to-minor-units.mjs` has
 * run. See CALCULATION-AUDIT.md issue #17c.
 */

/**
 * Parses user input in major units ("123.45") into whole minor units (12345).
 *
 * Decimal strings are split textually rather than multiplied, because
 * `Math.round(1.005 * 100)` is 100, not 101 — 1.005 has no exact binary
 * representation and lands just below the midpoint.
 */
export function toMinorUnits(input: string | number): number {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return 0
    return Math.round(input * MINOR_UNITS_PER_MAJOR)
  }

  const trimmed = input.trim()
  if (!trimmed) return 0

  const match = trimmed.match(/^([+-])?(\d*)(?:\.(\d*))?$/)
  if (!match) {
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? Math.round(parsed * MINOR_UNITS_PER_MAJOR) : 0
  }

  const [, sign, whole = '', frac = ''] = match
  const major = Number(whole || '0')
  const minor = Number((frac + '00').slice(0, 2) || '0')
  let total = major * MINOR_UNITS_PER_MAJOR + minor
  // Round rather than truncate anything beyond two decimals.
  if (frac.length > 2 && Number(frac[2]) >= 5) total += 1
  return sign === '-' ? -total : total
}

/** Whole minor units back to major units, for formatting only. */
export function fromMinorUnits(minor: number): number {
  return minor / MINOR_UNITS_PER_MAJOR
}

/** A minor-unit string suitable for a number input's value. */
export function minorToInputValue(minor: number): string {
  if (!Number.isFinite(minor)) return ''
  const negative = minor < 0
  const abs = Math.abs(Math.round(minor))
  const major = Math.floor(abs / MINOR_UNITS_PER_MAJOR)
  const frac = abs % MINOR_UNITS_PER_MAJOR
  const body = frac === 0 ? String(major) : `${major}.${String(frac).padStart(2, '0')}`
  return negative ? `-${body}` : body
}

/**
 * A stored amount in minor units, tolerating rows written before the migration.
 * Prefer the integer column; fall back to the legacy float.
 */
export function readAmountMinor(t: Pick<Transaction, 'amount' | 'amountMinor'>): number {
  return t.amountMinor ?? Math.round((t.amount ?? 0) * MINOR_UNITS_PER_MAJOR)
}

export function readFromAmountMinor(
  t: Pick<Transaction, 'fromAmount' | 'fromAmountMinor'>
): number {
  return t.fromAmountMinor ?? Math.round((t.fromAmount ?? 0) * MINOR_UNITS_PER_MAJOR)
}

export function readToAmountMinor(t: Pick<Transaction, 'toAmount' | 'toAmountMinor'>): number {
  return t.toAmountMinor ?? Math.round((t.toAmount ?? 0) * MINOR_UNITS_PER_MAJOR)
}
