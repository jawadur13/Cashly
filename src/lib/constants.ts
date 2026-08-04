import type { AccountType, TransactionType } from '@/lib/types'

export const DEFAULT_ACCOUNTS: { name: string; type: AccountType }[] = [
  { name: 'Cash', type: 'cash' },
  { name: 'Bank', type: 'bank' },
  { name: 'bKash', type: 'mobile-wallet' },
  { name: 'Nagad', type: 'mobile-wallet' },
]

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Cash',
  bank: 'Bank',
  'mobile-wallet': 'Mobile Wallet',
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: 'Income',
  expense: 'Expense',
  exchange: 'Exchange',
  give: 'Give',
  take: 'Take',
}
