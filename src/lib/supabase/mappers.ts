/**
 * Supabase rows (snake_case) ↔ the app's domain shapes (camelCase, `$id`).
 *
 * The domain types predate Supabase and every component reads `$id`,
 * `$createdAt`, `userId` and so on, so the shapes stay as they are and rows are
 * translated here, at the boundary. The migration verifier reads every copied
 * row back through these functions, so a mapping bug fails the copy.
 */
import type { Account, Category, Person, Transaction } from '@/lib/types'

export interface AccountRow {
  id: string
  user_id: string
  name: string
  type: Account['type']
  currency: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface PersonRow {
  id: string
  user_id: string
  name: string
  note: string | null
  share_token: string | null
  created_at: string
  updated_at: string
}

export interface CategoryRow {
  id: string
  type: Category['type']
  name: string
  icon: string
  color: string | null
  is_custom: boolean
  owner_id: string | null
  created_at: string
  updated_at: string
}

export interface TransactionRow {
  id: string
  user_id: string
  account_id: string
  type: Transaction['type']
  amount: number
  amount_minor: number | null
  currency: string
  category_id: string
  payee: string | null
  note: string | null
  date: string
  from_account_id: string | null
  to_account_id: string | null
  from_amount: number | null
  from_amount_minor: number | null
  to_amount: number | null
  to_amount_minor: number | null
  person_id: string | null
  created_at: string
  updated_at: string
}

export interface ShareRow {
  id: string
  share_token: string
  person_name: string
  shared_by_name: string | null
  person_id: string
  user_id: string
  data: string | null
  created_at: string
  updated_at: string
}

export interface ProfileRow {
  id: string
  name: string
  default_currency: string
  appwrite_user_id: string | null
  created_at: string
  updated_at: string
}

/** Postgres bigint can arrive as a string; amounts are always safe integers. */
function toIntOrNull(value: number | string | null): number | null {
  return value == null ? null : Number(value)
}

const meta = (row: { id: string; created_at: string; updated_at: string }) => ({
  $id: row.id,
  $createdAt: row.created_at,
  $updatedAt: row.updated_at,
})

export function rowToAccount(row: AccountRow): Account {
  return {
    ...meta(row),
    userId: row.user_id,
    name: row.name,
    type: row.type,
    currency: row.currency,
    isDefault: row.is_default,
  }
}

export function rowToPerson(row: PersonRow): Person {
  return {
    ...meta(row),
    userId: row.user_id,
    name: row.name,
    note: row.note ?? '',
    shareToken: row.share_token ?? undefined,
  }
}

export function rowToCategory(row: CategoryRow): Category {
  return {
    ...meta(row),
    type: row.type,
    name: row.name,
    icon: row.icon,
    color: row.color,
    isCustom: row.is_custom,
    // Predefined categories have no owner; the domain has always used ''.
    ownerId: row.owner_id ?? '',
  }
}

export function rowToTransaction(row: TransactionRow): Transaction {
  return {
    ...meta(row),
    userId: row.user_id,
    accountId: row.account_id,
    type: row.type,
    amount: row.amount,
    amountMinor: toIntOrNull(row.amount_minor) ?? undefined,
    currency: row.currency,
    categoryId: row.category_id,
    payee: row.payee ?? '',
    note: row.note ?? '',
    date: row.date,
    fromAccountId: row.from_account_id ?? undefined,
    toAccountId: row.to_account_id ?? undefined,
    fromAmount: row.from_amount ?? undefined,
    fromAmountMinor: toIntOrNull(row.from_amount_minor) ?? undefined,
    toAmount: row.to_amount ?? undefined,
    toAmountMinor: toIntOrNull(row.to_amount_minor) ?? undefined,
    personId: row.person_id ?? undefined,
  }
}
