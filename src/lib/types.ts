import type { Models } from 'appwrite'

export type TransactionType = 'income' | 'expense'
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
  amount: number
  currency: string
  categoryId: string
  payee: string
  note: string
  date: string
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
