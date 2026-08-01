import { getCurrency } from './currencies'

export function formatCurrency(amount: number, currencyCode: string): string {
  const currency = getCurrency(currencyCode)
  try {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency.symbol}${amount.toLocaleString()}`
  }
}

export function formatSignedAmount(
  amount: number,
  currencyCode: string,
  type: 'income' | 'expense'
): string {
  const formatted = formatCurrency(Math.abs(amount), currencyCode)
  if (type === 'income') return `+${formatted}`
  return `-${formatted}`
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
