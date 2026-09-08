export type CurrencyCode =
  | 'BDT'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'INR'
  | 'SAR'
  | 'AED'
  | 'MYR'

export interface CurrencyInfo {
  code: CurrencyCode
  locale: string
  symbol: string
  name: string
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'BDT', locale: 'en-BD', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'USD', locale: 'en-US', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', locale: 'de-DE', symbol: '€', name: 'Euro' },
  { code: 'GBP', locale: 'en-GB', symbol: '£', name: 'British Pound' },
  { code: 'INR', locale: 'en-IN', symbol: '₹', name: 'Indian Rupee' },
  { code: 'SAR', locale: 'en-SA', symbol: 'SR', name: 'Saudi Riyal' },
  { code: 'AED', locale: 'en-AE', symbol: 'AED', name: 'UAE Dirham' },
  { code: 'MYR', locale: 'ms-MY', symbol: 'RM', name: 'Malaysian Ringgit' },
]

export const DEFAULT_CURRENCY: CurrencyCode = 'BDT'

/**
 * Every supported currency divides into 100 minor units. Amounts are stored as
 * whole minor units, so this is the single scale factor the app needs. Adding a
 * currency without a 2-decimal subunit (JPY, KWD) would break that assumption —
 * see `toMinorUnits` in `@/lib/money`.
 */
export const MINOR_UNITS_PER_MAJOR = 100

export function isSupportedCurrency(code: string): code is CurrencyCode {
  return CURRENCIES.some((c) => c.code === code)
}

/**
 * Currency metadata for a code. Unknown codes keep their own identity rather
 * than silently borrowing the default currency's symbol — labelling a foreign
 * amount with a taka sign would be worse than showing the bare code.
 */
export function getCurrency(code: string): CurrencyInfo {
  const known = CURRENCIES.find((c) => c.code === code)
  if (known) return known
  return { code: code as CurrencyCode, locale: 'en-US', symbol: `${code} `, name: code }
}

export const RATES_RELATIVE_TO_BDT: Record<CurrencyCode, number> = {
  BDT: 1,
  USD: 123.25,
  EUR: 135,
  GBP: 155,
  INR: 1.47,
  SAR: 32.87,
  AED: 33.56,
  MYR: 27.7,
}

const warnedMissingRates = new Set<string>()

/**
 * Converts between currencies via their BDT-relative rates.
 *
 * When a rate is missing the amount is returned unchanged, which is the only
 * non-destructive option mid-render — but it silently treats one currency as
 * another, so it warns rather than passing quietly. Warn once per code to keep
 * the console readable.
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number> = RATES_RELATIVE_TO_BDT
): number {
  if (from === to) return amount
  const fromRate = rates[from]
  const toRate = rates[to]
  if (fromRate == null || toRate == null) {
    const missing = fromRate == null ? from : to
    if (!warnedMissingRates.has(missing)) {
      warnedMissingRates.add(missing)
      console.warn(
        `[cashly] No exchange rate for "${missing}". Amounts in ${from} are being shown as ${to} without conversion.`
      )
    }
    return amount
  }
  return (amount * fromRate) / toRate
}

/**
 * Converts an amount held in whole minor units, rounding back to a whole minor
 * unit. Conversion produces a real number, and leaving fractional paisa in the
 * totals would reintroduce exactly the drift minor units exist to prevent.
 */
export function convertMinor(
  minorAmount: number,
  from: string,
  to: string,
  rates: Record<string, number> = RATES_RELATIVE_TO_BDT
): number {
  return Math.round(convertCurrency(minorAmount, from, to, rates))
}
