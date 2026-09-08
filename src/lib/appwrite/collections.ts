import { ID, Permission, Query, Role } from 'appwrite'
import { databases } from './client'
import { fromMinorUnits } from '@/lib/money'
import { COLLECTIONS, DATABASE_ID } from './config'
import type { Account, AccountType, Category, Person, Transaction, TransactionType } from '@/lib/types'

const ownerPermissions = (userId: string) => [
  Permission.read(Role.user(userId)),
  Permission.update(Role.user(userId)),
  Permission.delete(Role.user(userId)),
]

/* ---------------- Accounts ---------------- */

export async function listAccounts(userId: string): Promise<Account[]> {
  const res = await databases.listDocuments<Account>(DATABASE_ID, COLLECTIONS.accounts, [
    Query.equal('userId', userId),
    Query.orderAsc('$createdAt'),
  ])
  return res.documents
}

export async function createAccount(data: {
  userId: string
  name: string
  type: AccountType
  currency: string
  isDefault?: boolean
}): Promise<Account> {
  return databases.createDocument<Account>(
    DATABASE_ID,
    COLLECTIONS.accounts,
    ID.unique(),
    { ...data, isDefault: data.isDefault ?? false },
    ownerPermissions(data.userId)
  )
}

/**
 * Currency is deliberately absent: balances are stored as bare numbers whose
 * currency comes from the account, so changing it would re-value every past
 * transaction without recording anything. It is fixed at creation.
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
  return databases.updateDocument<Account>(DATABASE_ID, COLLECTIONS.accounts, accountId, payload)
}

export async function deleteAccount(accountId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.accounts, accountId)
}

/** Every transaction that touches an account, through any of its three references. */
export async function listTransactionsByAccount(
  userId: string,
  accountId: string
): Promise<Transaction[]> {
  // Filtered in memory rather than with a server-side OR: `fromAccountId` and
  // `toAccountId` have no index, so a query on them is not guaranteed to be
  // accepted. Transfers reference accounts only through those two fields, and
  // missing them here would under-report what a deletion affects.
  const PAGE_SIZE = 500
  const all: Transaction[] = []
  let offset = 0
  let total = 0
  do {
    const res = await listTransactions({ userId, limit: PAGE_SIZE, offset })
    all.push(...res.documents)
    if (total === 0) total = res.total
    offset += res.documents.length
    if (res.documents.length === 0) break
  } while (offset < total)

  return all.filter(
    (t) => t.accountId === accountId || t.fromAccountId === accountId || t.toAccountId === accountId
  )
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
 * transactions is not.
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
  // created in between would otherwise be reassigned to an empty id and
  // orphaned permanently.
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

  let moved = 0
  for (const t of affected) {
    const patch: Record<string, string> = {}
    if (t.accountId === accountId) patch.accountId = destinationAccountId
    if (t.fromAccountId === accountId) patch.fromAccountId = destinationAccountId
    if (t.toAccountId === accountId) patch.toAccountId = destinationAccountId
    if (Object.keys(patch).length === 0) continue

    await databases.updateDocument<Transaction>(
      DATABASE_ID,
      COLLECTIONS.transactions,
      t.$id,
      patch
    )
    moved += 1
  }

  await deleteAccount(accountId)
  return { moved }
}

/* ---------------- People ---------------- */

export async function listPeople(userId: string): Promise<Person[]> {
  const res = await databases.listDocuments<Person>(DATABASE_ID, COLLECTIONS.people, [
    Query.equal('userId', userId),
    Query.orderAsc('name'),
  ])
  return res.documents
}

export async function createPerson(data: {
  userId: string
  name: string
  note?: string
}): Promise<Person> {
  return databases.createDocument<Person>(
    DATABASE_ID,
    COLLECTIONS.people,
    ID.unique(),
    { userId: data.userId, name: data.name, note: data.note ?? '' },
    ownerPermissions(data.userId)
  )
}

export async function updatePerson(
  personId: string,
  data: { name?: string; note?: string }
): Promise<Person> {
  return databases.updateDocument<Person>(DATABASE_ID, COLLECTIONS.people, personId, data)
}

export async function deletePerson(personId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.people, personId)
}

export async function generateShareToken(
  personId: string,
  personName: string,
  sharedByName: string,
  userId: string,
  defaultCurrency: string
): Promise<string> {
  const token = ID.unique()
  // Only the display currency is stored — the share page fetches live
  // transactions from /api/share/[token] rather than a frozen snapshot.
  const data = JSON.stringify({ currency: defaultCurrency })

  await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.shares,
    ID.unique(),
    {
      shareToken: token,
      personName,
      sharedByName,
      personId,
      userId,
      data,
    },
    // No public read here — /api/share/[token] reads this server-side with
    // the admin key, so the share document itself only needs to be visible
    // to its owner (and deletable by them, via "Stop").
    ownerPermissions(userId)
  )

  await databases.updateDocument(DATABASE_ID, COLLECTIONS.people, personId, { shareToken: token })
  return token
}

export async function removeShareToken(personId: string, userId: string): Promise<void> {
  const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.shares, [
    Query.equal('personId', personId),
    Query.limit(10),
  ])
  for (const doc of res.documents) {
    try { await databases.deleteDocument(DATABASE_ID, COLLECTIONS.shares, doc.$id) } catch { /* already gone */ }
  }
  await databases.updateDocument(DATABASE_ID, COLLECTIONS.people, personId, { shareToken: '' })
}

/* ---------------- Categories ---------------- */

export async function listCategories(userId: string): Promise<Category[]> {
  const res = await databases.listDocuments<Category>(DATABASE_ID, COLLECTIONS.categories, [
    Query.or([Query.equal('ownerId', userId), Query.equal('ownerId', '')]),
    Query.limit(100),
  ])
  return res.documents
}

export async function createCategory(data: {
  userId: string
  type: TransactionType
  name: string
  icon: string
}): Promise<Category> {
  const { userId, ...rest } = data
  return databases.createDocument<Category>(
    DATABASE_ID,
    COLLECTIONS.categories,
    ID.unique(),
    { ...rest, color: '', isCustom: true, ownerId: userId },
    ownerPermissions(userId)
  )
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.categories, categoryId)
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

export async function listTransactions(
  filters: TransactionFilters
): Promise<{ documents: Transaction[]; total: number }> {
  const queries = [Query.equal('userId', filters.userId), Query.orderDesc('date'), Query.limit(filters.limit ?? 20)]
  if (filters.type) queries.push(Query.equal('type', filters.type))
  if (filters.currency) queries.push(Query.equal('currency', filters.currency))
  if (filters.accountId) queries.push(Query.equal('accountId', filters.accountId))
  if (filters.personId) queries.push(Query.equal('personId', filters.personId))
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    queries.push(Query.equal('categoryId', filters.categoryIds))
  }
  if (filters.search) {
    queries.push(Query.or([Query.search('note', filters.search), Query.search('payee', filters.search)]))
  }
  if (filters.from) queries.push(Query.greaterThanEqual('date', filters.from))
  if (filters.to) queries.push(Query.lessThanEqual('date', filters.to))
  if (filters.offset) queries.push(Query.offset(filters.offset))

  const res = await databases.listDocuments<Transaction>(DATABASE_ID, COLLECTIONS.transactions, queries)
  return { documents: res.documents, total: res.total }
}

export async function getTransaction(transactionId: string): Promise<Transaction> {
  return databases.getDocument<Transaction>(DATABASE_ID, COLLECTIONS.transactions, transactionId)
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
  // Both columns are written: `amountMinor` is the real value, `amount` is kept
  // in step so rows stay readable by any client that has not been updated yet,
  // and so the change is reversible. See CALCULATION-AUDIT.md issue #17c.
  const base = {
    userId: data.userId,
    accountId: data.accountId,
    type: data.type,
    amount: fromMinorUnits(data.amountMinor),
    amountMinor: data.amountMinor,
    currency: data.currency,
    categoryId: data.categoryId,
    payee: data.payee ?? '',
    note: data.note ?? '',
    date: data.date,
    personId: data.personId,
  }
  const doc =
    data.fromAccountId != null
      ? {
          ...base,
          fromAccountId: data.fromAccountId,
          toAccountId: data.toAccountId ?? '',
          fromAmount: fromMinorUnits(data.fromAmountMinor ?? 0),
          fromAmountMinor: data.fromAmountMinor ?? 0,
          toAmount: fromMinorUnits(data.toAmountMinor ?? 0),
          toAmountMinor: data.toAmountMinor ?? 0,
        }
      : base

  return databases.createDocument<Transaction>(
    DATABASE_ID,
    COLLECTIONS.transactions,
    ID.unique(),
    doc,
    ownerPermissions(data.userId)
  )
}

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
  const doc: Record<string, unknown> = Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== undefined)
  )
  // Keep the legacy float column in step with every integer write.
  if (amountMinor !== undefined) {
    doc.amountMinor = amountMinor
    doc.amount = fromMinorUnits(amountMinor)
  }
  if (fromAmountMinor !== undefined) {
    doc.fromAmountMinor = fromAmountMinor
    doc.fromAmount = fromMinorUnits(fromAmountMinor)
  }
  if (toAmountMinor !== undefined) {
    doc.toAmountMinor = toAmountMinor
    doc.toAmount = fromMinorUnits(toAmountMinor)
  }
  return databases.updateDocument<Transaction>(DATABASE_ID, COLLECTIONS.transactions, transactionId, doc)
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.transactions, transactionId)
}

async function batchDeleteAll(
  collectionId: string,
  queries: string[]
): Promise<void> {
  const BATCH = 100
  while (true) {
    const res = await databases.listDocuments(DATABASE_ID, collectionId, [
      ...queries,
      Query.limit(BATCH),
    ])
    if (res.documents.length === 0) break
    await Promise.all(res.documents.map((d) => databases.deleteDocument(DATABASE_ID, collectionId, d.$id)))
    if (res.documents.length < BATCH) break
  }
}

export async function deleteUserData(userId: string): Promise<void> {
  await batchDeleteAll(COLLECTIONS.transactions, [Query.equal('userId', userId)])
  await batchDeleteAll(COLLECTIONS.accounts, [Query.equal('userId', userId)])
  await batchDeleteAll(COLLECTIONS.categories, [Query.equal('ownerId', userId)])
  await batchDeleteAll(COLLECTIONS.people, [Query.equal('userId', userId)])
  await batchDeleteAll(COLLECTIONS.shares, [Query.equal('userId', userId)])
}
