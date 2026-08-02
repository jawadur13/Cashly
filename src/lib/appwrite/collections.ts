import { ID, Permission, Query, Role } from 'appwrite'
import { databases } from './client'
import { COLLECTIONS, DATABASE_ID } from './config'
import type { Account, AccountType, Category, Transaction, TransactionType } from '@/lib/types'

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

/* ---------------- Categories ---------------- */

export async function listCategories(): Promise<Category[]> {
  const res = await databases.listDocuments<Category>(DATABASE_ID, COLLECTIONS.categories, [
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
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    queries.push(Query.equal('categoryId', filters.categoryIds))
  }
  if (filters.from) queries.push(Query.greaterThanEqual('date', filters.from))
  if (filters.to) queries.push(Query.lessThanEqual('date', filters.to))
  if (filters.offset) queries.push(Query.offset(filters.offset))

  const res = await databases.listDocuments<Transaction>(DATABASE_ID, COLLECTIONS.transactions, queries)
  return { documents: res.documents, total: res.total }
}

export async function searchTransactionsByNote(userId: string, term: string): Promise<Transaction[]> {
  const res = await databases.listDocuments<Transaction>(DATABASE_ID, COLLECTIONS.transactions, [
    Query.equal('userId', userId),
    Query.search('note', term),
    Query.limit(50),
  ])
  return res.documents
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
}): Promise<Transaction> {
  return databases.createDocument<Transaction>(
    DATABASE_ID,
    COLLECTIONS.transactions,
    ID.unique(),
    { ...data, payee: data.payee ?? '', note: data.note ?? '' },
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
  }>
): Promise<Transaction> {
  return databases.updateDocument<Transaction>(DATABASE_ID, COLLECTIONS.transactions, transactionId, data)
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.transactions, transactionId)
}
