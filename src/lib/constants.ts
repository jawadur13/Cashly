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
  exchange: 'Transfer',
  give: 'Give',
  take: 'Take',
}

/**
 * Where users go for a password reset while Supabase has no custom SMTP: its
 * built-in mailer only reaches project team members, so reset emails would
 * never arrive. Set to null once SMTP is configured to bring back the
 * self-service form on /auth/forgot-password.
 */
export const PASSWORD_RESET_CONTACT: string | null = 'contact@jawadurrafid.com'
