export type CurrencyCode =
  | 'BDT'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'INR'
  | 'JPY'
  | 'CAD'
  | 'AUD'
  | 'CHF'
  | 'BRL'
  | 'SGD'
  | 'HKD'
  | 'CNY'

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
  { code: 'JPY', locale: 'ja-JP', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', locale: 'en-CA', symbol: '$', name: 'Canadian Dollar' },
  { code: 'AUD', locale: 'en-AU', symbol: '$', name: 'Australian Dollar' },
  { code: 'CHF', locale: 'de-CH', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'BRL', locale: 'pt-BR', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'SGD', locale: 'en-SG', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', locale: 'zh-HK', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'CNY', locale: 'zh-CN', symbol: '¥', name: 'Chinese Yuan' },
]

export const DEFAULT_CURRENCY: CurrencyCode = 'BDT'

export function isSupportedCurrency(code: string): code is CurrencyCode {
  return CURRENCIES.some((c) => c.code === code)
}

export function getCurrency(code: string): CurrencyInfo {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0]
}

export interface ExchangeRate {
  from: CurrencyCode
  to: CurrencyCode
  rate: number
}

export const RATES_RELATIVE_TO_BDT: Record<CurrencyCode, number> = {
  BDT: 1,
  USD: 123.25,
  EUR: 135,
  GBP: 155,
  INR: 1.47,
  JPY: 0.82,
  CAD: 89,
  AUD: 78,
  CHF: 142,
  BRL: 24,
  SGD: 91,
  HKD: 16,
  CNY: 17,
}

export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number> = RATES_RELATIVE_TO_BDT
): number {
  if (from === to) return amount
  const fromRate = rates[from]
  const toRate = rates[to]
  if (fromRate == null || toRate == null) return amount
  return (amount * fromRate) / toRate
}
