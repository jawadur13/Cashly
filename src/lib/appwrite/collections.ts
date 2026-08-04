import { ID, Permission, Query, Role } from 'appwrite'
import { databases } from './client'
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

export async function updateAccount(
  accountId: string,
  data: { name?: string; type?: AccountType; currency?: string }
): Promise<Account> {
  return databases.updateDocument<Account>(DATABASE_ID, COLLECTIONS.accounts, accountId, data)
}

export async function deleteAccount(accountId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.accounts, accountId)
}

export async function countTransactionsByAccount(
  userId: string,
  accountId: string
): Promise<number> {
  const res = await databases.listDocuments<Transaction>(DATABASE_ID, COLLECTIONS.transactions, [
    Query.equal('userId', userId),
    Query.equal('accountId', accountId),
    Query.limit(1),
  ])
  return res.total
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

export async function getPersonByShareToken(token: string): Promise<Person> {
  const res = await databases.listDocuments<Person>(DATABASE_ID, COLLECTIONS.people, [
    Query.equal('shareToken', token),
    Query.limit(1),
  ])
  if (res.documents.length === 0) throw new Error('Share link not found')
  return res.documents[0]
}

export async function generateShareToken(personId: string): Promise<string> {
  const token = ID.unique()
  await databases.updateDocument(DATABASE_ID, COLLECTIONS.people, personId, { shareToken: token })
  return token
}

export async function removeShareToken(personId: string): Promise<void> {
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
  amount: number
  currency: string
  categoryId: string
  payee?: string
  note?: string
  date: string
  fromAccountId?: string
  toAccountId?: string
  fromAmount?: number
  toAmount?: number
  personId?: string
}): Promise<Transaction> {
  const base = {
    userId: data.userId,
    accountId: data.accountId,
    type: data.type,
    amount: data.amount,
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
          fromAmount: data.fromAmount ?? 0,
          toAmount: data.toAmount ?? 0,
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
    amount: number
    currency: string
    categoryId: string
    payee: string
    note: string
    date: string
    fromAccountId: string
    toAccountId: string
    fromAmount: number
    toAmount: number
    personId: string
  }>
): Promise<Transaction> {
  const doc = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  )
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
}
