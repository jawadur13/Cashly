/* Cashly — one-time DB setup script.
   Creates collections, attributes, indexes, and seeds predefined categories.
   Run: node scripts/setup-db.mjs
   Reads .env.local (APPWRITE_* values). Idempotent: safe to re-run.
*/
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client, Databases, Permission, Role, Query } from 'node-appwrite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env.local')
const env = {}
for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}

const endpoint = env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const projectId = env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
const apiKey = env.APPWRITE_API_KEY
const databaseId = env.APPWRITE_DATABASE_ID

if (!endpoint || !projectId || !apiKey || !databaseId) {
  console.error('Missing env values in .env.local')
  process.exit(1)
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey)
const db = new Databases(client)

const log = (msg) => console.log(msg)
const exists = (arr, id) => arr.some((i) => i.$id === id)

async function ensureCollection(collectionId, name) {
  let list = await db.listCollections(databaseId)
  if (exists(list.collections, collectionId)) {
    log(`collection ${collectionId} exists`)
    return
  }
  await db.createCollection(databaseId, collectionId, name, [
    Permission.create(Role.users()),
  ])
  log(`created collection ${collectionId}`)
}

async function ensureCreatePermission(collectionId) {
  try {
    await db.updateCollection(
      databaseId,
      collectionId,
      undefined,
      [Permission.create(Role.users())],
      true
    )
    log(`  + document security (create only) ${collectionId}`)
  } catch (e) {
    log(`  create permission ${collectionId}: ${e.message}`)
  }
}

async function ensureString(collectionId, key, required, size) {
  try {
    await db.createStringAttribute(databaseId, collectionId, key, size, required)
    log(`  + string ${key}`)
  } catch (e) {
    log(`  string ${key}: ${e.message}`)
  }
}

async function ensureDatetime(collectionId, key, required) {
  try {
    await db.createDatetimeAttribute(databaseId, collectionId, key, required)
    log(`  + datetime ${key}`)
  } catch (e) {
    log(`  datetime ${key}: ${e.message}`)
  }
}

async function ensureEnum(collectionId, key, values, required) {
  try {
    await db.createEnumAttribute(databaseId, collectionId, key, values, required, null)
    log(`  + enum ${key}`)
  } catch (e) {
    log(`  enum ${key} (create): ${e.message}`)
    // If it already exists, try updating it to include new values
    try {
      await db.updateEnumAttribute(databaseId, collectionId, key, values, required, null)
      log(`  + enum ${key} (updated)`)
    } catch (e2) {
      log(`  enum ${key} (update): ${e2.message}`)
    }
  }
}

async function ensureBoolean(collectionId, key, required, defaultValue = null) {
  try {
    const defaultValueToUse = required ? null : defaultValue
    await db.createBooleanAttribute(databaseId, collectionId, key, required, defaultValueToUse)
    log(`  + boolean ${key}`)
  } catch (e) {
    log(`  boolean ${key}: ${e.message}`)
  }
}

async function ensureDouble(collectionId, key, required) {
  try {
    await db.createFloatAttribute(databaseId, collectionId, key, required)
    log(`  + float ${key}`)
  } catch (e) {
    log(`  float ${key}: ${e.message}`)
  }
}

async function ensureIndex(collectionId, indexId, type, attributes, order) {
  try {
    await db.createIndex(databaseId, collectionId, indexId, type, attributes, [order])
    log(`  + index ${indexId}`)
  } catch (e) {
    log(`  index ${indexId}: ${e.message}`)
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/* ---------- accounts ---------- */
const ACCOUNTS = 'accounts'
await ensureCollection(ACCOUNTS, 'Accounts')
await ensureCreatePermission(ACCOUNTS)
await ensureString(ACCOUNTS, 'userId', true, 36)
await ensureString(ACCOUNTS, 'name', true, 40)
await ensureEnum(ACCOUNTS, 'type', ['cash', 'bank', 'mobile-wallet'], true)
await ensureString(ACCOUNTS, 'currency', true, 3)
await ensureBoolean(ACCOUNTS, 'isDefault', true, false)
await wait(1500)
await ensureIndex(ACCOUNTS, 'by_user', 'key', ['userId'], 'ASC')
await wait(1500)

/* ---------- transactions ---------- */
const TRANSACTIONS = 'transactions'
await ensureCollection(TRANSACTIONS, 'Transactions')
await ensureCreatePermission(TRANSACTIONS)
await ensureString(TRANSACTIONS, 'userId', true, 36)
await ensureString(TRANSACTIONS, 'accountId', true, 36)
await ensureEnum(TRANSACTIONS, 'type', ['income', 'expense', 'exchange', 'give', 'take'], true)
await ensureDouble(TRANSACTIONS, 'amount', true)
await ensureString(TRANSACTIONS, 'currency', true, 3)
await ensureString(TRANSACTIONS, 'categoryId', true, 36)
await ensureString(TRANSACTIONS, 'payee', false, 200)
await ensureString(TRANSACTIONS, 'note', false, 500)
await ensureDatetime(TRANSACTIONS, 'date', true)
await ensureString(TRANSACTIONS, 'fromAccountId', false, 36)
await ensureString(TRANSACTIONS, 'toAccountId', false, 36)
await ensureDouble(TRANSACTIONS, 'fromAmount', false)
await ensureDouble(TRANSACTIONS, 'toAmount', false)
await ensureString(TRANSACTIONS, 'personId', false, 36)
await wait(1500)
await ensureIndex(TRANSACTIONS, 'by_user_date', 'key', ['userId', 'date'], 'DESC')
await ensureIndex(TRANSACTIONS, 'by_user_account', 'key', ['userId', 'accountId', 'date'], 'DESC')
await ensureIndex(TRANSACTIONS, 'by_user_currency', 'key', ['userId', 'currency'], 'ASC')
await ensureIndex(TRANSACTIONS, 'by_user_type', 'key', ['userId', 'type'], 'ASC')
await ensureIndex(TRANSACTIONS, 'search_note', 'fulltext', ['note'], 'ASC')
await wait(1500)

/* ---------- people ---------- */
const PEOPLE = 'people'
await ensureCollection(PEOPLE, 'People')
await ensureCreatePermission(PEOPLE)
await ensureString(PEOPLE, 'userId', true, 36)
await ensureString(PEOPLE, 'name', true, 80)
await ensureString(PEOPLE, 'note', false, 500)
await ensureString(PEOPLE, 'shareToken', false, 36)
await wait(1500)
await ensureIndex(PEOPLE, 'by_user', 'key', ['userId'], 'ASC')
await ensureIndex(PEOPLE, 'by_share_token', 'unique', ['shareToken'], 'ASC')
await wait(1500)

/* ---------- categories ---------- */
const CATEGORIES = 'categories'
await ensureCollection(CATEGORIES, 'Categories')
await ensureCreatePermission(CATEGORIES)
await ensureEnum(CATEGORIES, 'type', ['income', 'expense', 'exchange'], true)
await ensureString(CATEGORIES, 'name', true, 40)
await ensureString(CATEGORIES, 'icon', true, 40)
await ensureString(CATEGORIES, 'color', false, 9)
await ensureBoolean(CATEGORIES, 'isCustom', true, false)
await ensureString(CATEGORIES, 'ownerId', false, 36)
await wait(1500)
await ensureIndex(CATEGORIES, 'by_type', 'key', ['type'], 'ASC')
await ensureIndex(CATEGORIES, 'by_owner', 'key', ['ownerId'], 'ASC')
await wait(1500)

/* ---------- seed predefined categories ---------- */
const presets = [
  // expense
  ['food', 'Food', 'utensils', 'expense'],
  ['shopping', 'Shopping', 'shopping-bag', 'expense'],
  ['transport', 'Transport', 'car', 'expense'],
  ['housing', 'Housing', 'home', 'expense'],
  ['bills', 'Bills', 'receipt', 'expense'],
  ['health', 'Health', 'heart-pulse', 'expense'],
  ['education', 'Education', 'graduation-cap', 'expense'],
  ['entertainment', 'Entertainment', 'clapperboard', 'expense'],
  ['travel', 'Travel', 'plane', 'expense'],
  ['phone', 'Phone', 'smartphone', 'expense'],
  ['other-expense', 'Other', 'more-horizontal', 'expense'],
  // income
  ['salary', 'Salary', 'briefcase', 'income'],
  ['freelance', 'Freelance', 'laptop', 'income'],
  ['investments', 'Investments', 'trending-up', 'income'],
  ['gift', 'Gift', 'gift', 'income'],
  ['other-income', 'Other', 'more-horizontal', 'income'],
]

const seeded = (await db.listDocuments(databaseId, CATEGORIES, [Query.limit(1)])).total
if (seeded === 0) {
  for (const [id, name, icon, type] of presets) {
    await db.createDocument(
      databaseId,
      CATEGORIES,
      id,
      { type, name, icon, isCustom: false, ownerId: '' },
      [Permission.read(Role.users())]
    )
    log(`  seeded category ${id}`)
  }
} else {
  log('categories already seeded, skipping')
}

console.log('\nDone.')
