import type { Models } from 'appwrite'

export type TransactionType = 'income' | 'expense' | 'exchange' | 'give' | 'take'
export type AccountType = 'cash' | 'bank' | 'mobile-wallet'

export interface Account extends Models.Document {
  userId: string
  name: string
  type: AccountType
  currency: string
  isDefault: boolean
}

export interface Transaction extends Models.Document {
  userId: string
  accountId: string
  type: TransactionType
  /**
   * Legacy amount in major units (taka), stored as a float. Still written for
   * backwards compatibility — read `amountMinor` via `readAmountMinor` instead.
   */
  amount: number
  /** Amount in whole minor units (paisa). Absent on rows written before the migration. */
  amountMinor?: number
  currency: string
  categoryId: string
  payee: string
  note: string
  date: string
  fromAccountId?: string
  toAccountId?: string
  /** @deprecated read `fromAmountMinor` via `readFromAmountMinor` */
  fromAmount?: number
  fromAmountMinor?: number
  /** @deprecated read `toAmountMinor` via `readToAmountMinor` */
  toAmount?: number
  toAmountMinor?: number
  personId?: string
}

export interface Person extends Models.Document {
  userId: string
  name: string
  note: string
  shareToken?: string
  sharedByName?: string
}

export interface Category extends Models.Document {
  type: TransactionType
  name: string
  icon: string
  color: string
  isCustom: boolean
  ownerId: string
}

export interface UserPrefs {
  defaultCurrency?: string
}
