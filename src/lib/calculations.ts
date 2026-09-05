import { convertCurrency } from './currency/currencies'
import type { Transaction } from './types'

/**
 * Cash-direction convention shared by account balances, people balances, and
 * the Summary hook: income/take add cash, expense/give remove it. Exchange
 * is two-sided and handled separately by callers via fromAmount/toAmount.
 */
export function signedCashDelta(t: Pick<Transaction, 'type' | 'amount'>): number {
  if (t.type === 'income' || t.type === 'take') return t.amount
  if (t.type === 'expense' || t.type === 'give') return -t.amount
  return 0
}

/**
 * Net value of an exchange, expressed in `target` currency.
 *
 * Each leg is denominated in its own account's currency — `fromAmount` in the
 * source account's, `toAmount` in the destination's. They must therefore be
 * converted independently *before* subtracting. Subtracting the raw amounts
 * first and converting the difference (as this used to do) invents money
 * whenever the two accounts differ: 2 USD -> 224 BDT read as a 27,361 BDT
 * gain instead of a 22.50 BDT loss.
 *
 * Falls back to the transaction's own currency when an account is missing
 * (deleted account, or a row written before the accounts were loaded), which
 * keeps same-currency exchanges exact and degrades gracefully otherwise.
 */
export function exchangeNet(
  t: Pick<Transaction, 'currency' | 'fromAccountId' | 'toAccountId' | 'fromAmount' | 'toAmount'>,
  accountCurrency: Record<string, string>,
  target: string,
  rates?: Record<string, number>
): number {
  const fromCurrency = (t.fromAccountId ? accountCurrency[t.fromAccountId] : undefined) ?? t.currency
  const toCurrency = (t.toAccountId ? accountCurrency[t.toAccountId] : undefined) ?? t.currency
  return (
    convertCurrency(t.toAmount ?? 0, toCurrency, target, rates) -
    convertCurrency(t.fromAmount ?? 0, fromCurrency, target, rates)
  )
}
