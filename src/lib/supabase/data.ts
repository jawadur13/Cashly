import { supabase } from './client'
import { fromMinorUnits } from '@/lib/money'
import {
  rowToAccount,
  rowToCategory,
  rowToPerson,
  rowToTransaction,
  type AccountRow,
  type CategoryRow,
  type PersonRow,
  type TransactionRow,
} from './mappers'
import type { Account, AccountType, Category, Person, Transaction, TransactionType } from '@/lib/types'

// Row Level Security limits every query to the signed-in user's rows. The
// explicit user_id filters below are kept anyway: they document intent and
// let Postgres use the per-user indexes.

// The client is untyped (no generated schema), so callers name the row type.
function unwrap<T>({ data, error }: { data: unknown; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  return data as T
}

/** Quotes a value for a PostgREST `or=(...)` filter, where commas and parentheses are syntax. */
const quote = (value: string) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

/** An ILIKE pattern matching `term` anywhere, with its own % and _ taken literally. */
const containsPattern = (term: string) => `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`

/* ---------------- Accounts ---------------- */

export async function listAccounts(userId: string): Promise<Account[]> {
  const rows = unwrap<AccountRow[]>(
    await supabase.from('accounts').select('*').eq('user_id', userId).order('created_at').order('id')
  )
  return rows.map(rowToAccount)
}

export async function createAccount(data: {
  userId: string
  name: string
  type: AccountType
  currency: string
  isDefault?: boolean
}): Promise<Account> {
  const row = unwrap<AccountRow>(
    await supabase
      .from('accounts')
      .insert({
        user_id: data.userId,
        name: data.name,
        type: data.type,
        currency: data.currency,
        is_default: data.isDefault ?? false,
      })
      .select()
      .single()
  )
  return rowToAccount(row)
}

/**
 * Currency is deliberately absent: balances are stored as bare numbers whose
 * currency comes from the account, so changing it would re-value every past
 * transaction without recording anything. It is fixed at creation, and the
 * database refuses a change too.
 */
export async function updateAccount(
  accountId: string,
  data: { name?: string; type?: AccountType }
): Promise<Account> {
  // Built field by field rather than forwarding `data`: a caller passing a
  // wider object (the account form submits a currency too) would otherwise
  // write it straight through, and TypeScript does not flag extra properties
  // on a variable.
  const payload: Record<string, string> = {}
  if (data.name !== undefined) payload.name = data.name
  if (data.type !== undefined) payload.type = data.type
  const row = unwrap<AccountRow>(
    await supabase.from('accounts').update(payload).eq('id', accountId).select().single()
  )
  return rowToAccount(row)
}

export async function deleteAccount(accountId: string): Promise<void> {
  unwrap(await supabase.from('accounts').delete().eq('id', accountId))
}

/** Every transaction that touches an account, through any of its three references. */
export async function listTransactionsByAccount(
  userId: string,
  accountId: string
): Promise<Transaction[]> {
  const id = quote(accountId)
  const rows = await fetchAllTransactionRows((q) =>
    q.eq('user_id', userId).or(`account_id.eq.${id},from_account_id.eq.${id},to_account_id.eq.${id}`)
  )
  return rows.map(rowToTransaction)
}

/**
 * Points every transaction on `fromAccountId` at `toAccountId`, then removes the
 * now-empty account. Nothing is ever deleted except the account record itself.
 *
 * The two accounts must share a currency: amounts are stored as bare numbers and
 * take their currency from the account, so moving them somewhere else would
 * silently re-value them.
 *
 * If any transaction fails to move, the account is left in place — a partly
 * reassigned account is recoverable, an account deleted out from under its
 * transactions is not. The database backs this up: it refuses to delete an
 * account that any transaction still references.
 */
export async function reassignAndDeleteAccount(
  userId: string,
  accountId: string,
  destinationAccountId: string
): Promise<{ moved: number }> {
  if (accountId === destinationAccountId) {
    throw new Error('Choose a different destination account')
  }

  // Checked here rather than trusted from the caller: the accounts page enables
  // Delete as soon as its pre-fetched count reads zero, and a transaction
  // created in between must still be moved.
  const accounts = await listAccounts(userId)
  const source = accounts.find((a) => a.$id === accountId)
  const destination = accounts.find((a) => a.$id === destinationAccountId)
  if (!source) throw new Error('Account not found')
  if (!destination) throw new Error('Choose an account to move the transactions to')
  if (source.currency !== destination.currency) {
    throw new Error(
      `Transactions can only move between accounts of the same currency (${source.currency} to ${destination.currency})`
    )
  }

  const affected = await listTransactionsByAccount(userId, accountId)

  for (const column of ['account_id', 'from_account_id', 'to_account_id'] as const) {
    unwrap(
      await supabase
        .from('transactions')
        .update({ [column]: destinationAccountId })
        .eq('user_id', userId)
        .eq(column, accountId)
    )
  }

  await deleteAccount(accountId)
  return { moved: affected.length }
}

/* ---------------- People ---------------- */

export async function listPeople(userId: string): Promise<Person[]> {
  const rows = unwrap<PersonRow[]>(
    await supabase.from('people').select('*').eq('user_id', userId).order('name')
  )
  return rows.map(rowToPerson)
}

export async function createPerson(data: {
  userId: string
  name: string
  note?: string
}): Promise<Person> {
  const row = unwrap<PersonRow>(
    await supabase
      .from('people')
      .insert({ user_id: data.userId, name: data.name, note: data.note ?? '' })
      .select()
      .single()
  )
  return rowToPerson(row)
}

export async function updatePerson(
  personId: string,
  data: { name?: string; note?: string }
): Promise<Person> {
  const row = unwrap<PersonRow>(
    await supabase.from('people').update(data).eq('id', personId).select().single()
  )
  return rowToPerson(row)
}

/**
 * Removes a person and their share links. The database refuses while any
 * transaction still names them — their give/take history would lose its
 * counterparty — so callers check for history first.
 */
export async function deletePerson(personId: string): Promise<void> {
  unwrap(await supabase.from('shares').delete().eq('person_id', personId))
  unwrap(await supabase.from('people').delete().eq('id', personId))
}

export async function generateShareToken(
  personId: string,
  personName: string,
  sharedByName: string,
  userId: string,
  defaultCurrency: string
): Promise<string> {
  const token = crypto.randomUUID()
  // Only the display currency is stored — the share page fetches live
  // transactions from /api/share/[token] rather than a frozen snapshot.
  const data = JSON.stringify({ currency: defaultCurrency })

  // Not readable by anyone but the owner: /api/share/[token] reads it
  // server-side with the secret key.
  unwrap(
    await supabase.from('shares').insert({
      share_token: token,
      person_name: personName,
      shared_by_name: sharedByName,
      person_id: personId,
      user_id: userId,
      data,
    })
  )
  unwrap(await supabase.from('people').update({ share_token: token }).eq('id', personId))
  return token
}

export async function removeShareToken(personId: string, userId: string): Promise<void> {
  unwrap(await supabase.from('shares').delete().eq('user_id', userId).eq('person_id', personId))
  unwrap(await supabase.from('people').update({ share_token: null }).eq('id', personId))
}

/* ---------------- Categories ---------------- */

export async function listCategories(userId: string): Promise<Category[]> {
  const rows = unwrap<CategoryRow[]>(
    await supabase
      .from('categories')
      .select('*')
      .or(`owner_id.eq.${quote(userId)},owner_id.is.null`)
      .limit(100)
  )
  return rows.map(rowToCategory)
}

export async function createCategory(data: {
  userId: string
  type: TransactionType
  name: string
  icon: string
}): Promise<Category> {
  const row = unwrap<CategoryRow>(
    await supabase
      .from('categories')
      .insert({
        type: data.type,
        name: data.name,
        icon: data.icon,
        color: '',
        is_custom: true,
        owner_id: data.userId,
      })
      .select()
      .single()
  )
  return rowToCategory(row)
}

export async function deleteCategory(categoryId: string): Promise<void> {
  unwrap(await supabase.from('categories').delete().eq('id', categoryId))
}

/* ---------------- Transactions ---------------- */

export interface TransactionFilters {
  userId: string
  type?: TransactionType
  currency?: string
  accountId?: string
  personId?: string
  search?: string
  categoryIds?: string[]
  from?: string
  to?: string
  limit?: number
  offset?: number
}

type TransactionQueryBuilder = ReturnType<ReturnType<typeof supabase.from>['select']>

/** Pages through every matching row; PostgREST caps a single response at 1,000. */
async function fetchAllTransactionRows(
  filter: (q: TransactionQueryBuilder) => TransactionQueryBuilder
): Promise<TransactionRow[]> {
  const PAGE_SIZE = 1000
  const all: TransactionRow[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = unwrap<TransactionRow[]>(
      await filter(supabase.from('transactions').select('*'))
        .order('date', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
    )
    all.push(...page)
    if (page.length < PAGE_SIZE) return all
  }
}

export async function listTransactions(
  filters: TransactionFilters
): Promise<{ documents: Transaction[]; total: number }> {
  // `date` is not unique, and offset pagination needs a total order or a row
  // can be returned twice or skipped across pages. `id` breaks the ties.
  let q = supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', filters.userId)
  if (filters.type) q = q.eq('type', filters.type)
  if (filters.currency) q = q.eq('currency', filters.currency)
  if (filters.accountId) q = q.eq('account_id', filters.accountId)
  if (filters.personId) q = q.eq('person_id', filters.personId)
  if (filters.categoryIds && filters.categoryIds.length > 0) q = q.in('category_id', filters.categoryIds)
  if (filters.search) {
    const pattern = quote(containsPattern(filters.search))
    q = q.or(`note.ilike.${pattern},payee.ilike.${pattern}`)
  }
  if (filters.from) q = q.gte('date', filters.from)
  if (filters.to) q = q.lte('date', filters.to)

  const limit = filters.limit ?? 20
  const offset = filters.offset ?? 0
  const { data, count, error } = await q
    .order('date', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw new Error(error.message)
  return { documents: (data as TransactionRow[]).map(rowToTransaction), total: count ?? 0 }
}

export async function getTransaction(transactionId: string): Promise<Transaction> {
  const row = unwrap<TransactionRow>(
    await supabase.from('transactions').select('*').eq('id', transactionId).single()
  )
  return rowToTransaction(row)
}

export async function createTransaction(data: {
  userId: string
  accountId: string
  type: TransactionType
  /** Whole minor units (paisa). */
  amountMinor: number
  currency: string
  categoryId: string
  payee?: string
  note?: string
  date: string
  fromAccountId?: string
  toAccountId?: string
  fromAmountMinor?: number
  toAmountMinor?: number
  personId?: string
}): Promise<Transaction> {
  // Both columns are written: `amount_minor` is the real value, `amount` is kept
  // in step so the change stays reversible. See CALCULATION-AUDIT.md issue #17c.
  const base = {
    user_id: data.userId,
    account_id: data.accountId,
    type: data.type,
    amount: fromMinorUnits(data.amountMinor),
    amount_minor: data.amountMinor,
    currency: data.currency,
    category_id: data.categoryId,
    payee: data.payee ?? '',
    note: data.note ?? '',
    date: data.date,
    person_id: data.personId || null,
  }
  const row =
    data.fromAccountId != null
      ? {
          ...base,
          from_account_id: data.fromAccountId,
          to_account_id: data.toAccountId || null,
          from_amount: fromMinorUnits(data.fromAmountMinor ?? 0),
          from_amount_minor: data.fromAmountMinor ?? 0,
          to_amount: fromMinorUnits(data.toAmountMinor ?? 0),
          to_amount_minor: data.toAmountMinor ?? 0,
        }
      : base

  const created = unwrap<TransactionRow>(
    await supabase.from('transactions').insert(row).select().single()
  )
  return rowToTransaction(created)
}

const TRANSACTION_COLUMNS = {
  accountId: 'account_id',
  type: 'type',
  currency: 'currency',
  categoryId: 'category_id',
  payee: 'payee',
  note: 'note',
  date: 'date',
  fromAccountId: 'from_account_id',
  toAccountId: 'to_account_id',
  personId: 'person_id',
} as const

/** References to other rows: an empty string means "none", which the database spells null. */
const NULLABLE_REFERENCES = new Set(['from_account_id', 'to_account_id', 'person_id'])

export async function updateTransaction(
  transactionId: string,
  data: Partial<{
    accountId: string
    type: TransactionType
    /** Whole minor units (paisa). */
    amountMinor: number
    currency: string
    categoryId: string
    payee: string
    note: string
    date: string
    fromAccountId: string
    toAccountId: string
    fromAmountMinor: number
    toAmountMinor: number
    personId: string
  }>
): Promise<Transaction> {
  const { amountMinor, fromAmountMinor, toAmountMinor, ...rest } = data
  const row: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined) continue
    const column = TRANSACTION_COLUMNS[key as keyof typeof TRANSACTION_COLUMNS]
    row[column] = NULLABLE_REFERENCES.has(column) && value === '' ? null : value
  }
  // Keep the legacy float column in step with every integer write.
  if (amountMinor !== undefined) {
    row.amount_minor = amountMinor
    row.amount = fromMinorUnits(amountMinor)
  }
  if (fromAmountMinor !== undefined) {
    row.from_amount_minor = fromAmountMinor
    row.from_amount = fromMinorUnits(fromAmountMinor)
  }
  if (toAmountMinor !== undefined) {
    row.to_amount_minor = toAmountMinor
    row.to_amount = fromMinorUnits(toAmountMinor)
  }
  const updated = unwrap<TransactionRow>(
    await supabase.from('transactions').update(row).eq('id', transactionId).select().single()
  )
  return rowToTransaction(updated)
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  unwrap(await supabase.from('transactions').delete().eq('id', transactionId))
}

/** Children before parents: the foreign keys refuse to orphan a row. */
export async function deleteUserData(userId: string): Promise<void> {
  unwrap(await supabase.from('transactions').delete().eq('user_id', userId))
  unwrap(await supabase.from('shares').delete().eq('user_id', userId))
  unwrap(await supabase.from('people').delete().eq('user_id', userId))
  unwrap(await supabase.from('accounts').delete().eq('user_id', userId))
  unwrap(await supabase.from('categories').delete().eq('owner_id', userId))
}
