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
