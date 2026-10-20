/**
 * The ONLY way migration scripts may reach Appwrite. Appwrite holds live
 * production data and the key in .env.appwrite.local can write, so this module
 * exposes list operations and nothing else. Do not add create/update/delete
 * here, and do not import node-appwrite anywhere else in the migration.
 */
import { Client, Databases, Users, Query } from 'node-appwrite'

const env = process.env
const endpoint = env.APPWRITE_ENDPOINT ?? env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const projectId = env.APPWRITE_PROJECT_ID ?? env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
const key = env.APPWRITE_READONLY_KEY ?? env.APPWRITE_API_KEY
export const databaseId = env.APPWRITE_DATABASE_ID ?? env.NEXT_PUBLIC_APPWRITE_DATABASE_ID

if (!endpoint || !projectId || !key || !databaseId) {
  throw new Error('Appwrite settings missing from .env.appwrite.local')
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(key)
const databases = new Databases(client)
const users = new Users(client)

export const COLLECTIONS = ['accounts', 'transactions', 'people', 'shares', 'categories']

const PAGE_SIZE = 100

// Cursor pagination: no 5,000-offset ceiling, and stable while paging.
async function listAllPages(fetchPage) {
  const rows = []
  let cursor = null
  for (;;) {
    const queries = [Query.limit(PAGE_SIZE), Query.orderAsc('$id')]
    if (cursor) queries.push(Query.cursorAfter(cursor))
    const page = await fetchPage(queries)
    rows.push(...page.items)
    if (page.items.length < PAGE_SIZE) return { rows, total: page.total }
    cursor = page.items[page.items.length - 1].$id
  }
}

export async function countDocuments(collectionId) {
  const res = await databases.listDocuments(databaseId, collectionId, [Query.limit(1)])
  return res.total
}

export async function countUsers() {
  const res = await users.list([Query.limit(1)])
  return res.total
}

export function listAllDocuments(collectionId) {
  return listAllPages(async (queries) => {
    const res = await databases.listDocuments(databaseId, collectionId, queries)
    return { items: res.documents, total: res.total }
  })
}

/** Includes each user's password hash, hash algorithm and prefs. */
export function listAllUsers() {
  return listAllPages(async (queries) => {
    const res = await users.list(queries)
    return { items: res.users, total: res.total }
  })
}
