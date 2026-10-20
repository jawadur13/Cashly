/**
 * Copies an Appwrite snapshot (from backup-appwrite.mjs) into Supabase, then
 * proves the copy is exact. Appwrite is only read, through
 * lib/appwrite-readonly.mjs, for the final "did anything change" check.
 *
 *   npx vite-node --config vitest.config.ts scripts/copy-to-supabase.ts <snapshot.json>
 *
 * Until cutover every run starts by RESETTING Supabase: it deletes the users
 * and rows a previous run created, then copies again. Once migration.state has
 * a row (set at cutover) the script refuses to run at all.
 *
 * Exit code 0 only when every check passed.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { accountBalances, peopleBalances } from '../src/lib/calculations'
import {
  rowToAccount,
  rowToCategory,
  rowToPerson,
  rowToTransaction,
  type AccountRow,
  type CategoryRow,
  type PersonRow,
  type TransactionRow,
} from '../src/lib/supabase/mappers'
import type { Transaction } from '../src/lib/types'

process.loadEnvFile('.env.appwrite.local')
process.loadEnvFile('.env.supabase.local')

// Snapshot documents are raw Appwrite JSON; their fields are checked, not typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>
interface Snapshot {
  takenAt: string
  counts: Record<string, number>
  users: Doc[]
  collections: Record<'accounts' | 'transactions' | 'people' | 'shares' | 'categories', Doc[]>
}

const APPWRITE_ONLY_FIELDS = new Set(['$sequence', '$permissions', '$databaseId', '$collectionId'])
const TIME_FIELDS = new Set(['$createdAt', '$updatedAt', 'date'])

const failures: string[] = []
const fail = (msg: string) => failures.push(msg)
const step = (msg: string) => console.log(`\n== ${msg}`)

// ---------------------------------------------------------------- load

const snapshotFile = process.argv[2]
if (!snapshotFile) {
  console.error('usage: copy-to-supabase.ts <snapshot.json>')
  process.exit(2)
}
const raw = readFileSync(snapshotFile, 'utf8')
const sha = createHash('sha256').update(raw).digest('hex')
const recordedSha = readFileSync(`${snapshotFile}.sha256`, 'utf8').split(/\s+/)[0]
if (sha !== recordedSha) {
  console.error(`Snapshot checksum mismatch: file ${sha}, recorded ${recordedSha}`)
  process.exit(1)
}
const snap: Snapshot = JSON.parse(raw)
console.log(`Snapshot ${path.basename(snapshotFile)} taken ${snap.takenAt}, sha256 verified`)

// Anything here we do not know how to carry over must stop the copy rather
// than be dropped silently.
step('Pre-flight checks on the snapshot')
for (const u of snap.users) {
  if (!u.status) fail(`user ${u.$id} is blocked in Appwrite; blocking is not migrated`)
  if (u.hash !== 'argon2' || !String(u.password).startsWith('$argon2id$')) fail(`user ${u.$id} has a non-argon2id hash`)
  const extraPrefs = Object.keys(u.prefs ?? {}).filter((k) => k !== 'defaultCurrency')
  if (extraPrefs.length) fail(`user ${u.$id} has prefs not mapped to profiles: ${extraPrefs.join(', ')}`)
  if (u.mfa) fail(`user ${u.$id} has MFA enabled; MFA is not migrated`)
}
if (new Set(snap.users.map((u) => u.email.toLowerCase())).size !== snap.users.length) {
  fail('two Appwrite users share an email (case-insensitively)')
}
if (failures.length) await finish()
console.log(`  ${snap.users.length} users OK`)

// ---------------------------------------------------------------- connect

const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } })
await db.connect()
const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const cutover = await db.query('select cutover_at from migration.state')
if (cutover.rowCount) {
  console.error(`Refusing to run: Supabase went live at ${cutover.rows[0].cutover_at.toISOString()}.`)
  await db.end()
  process.exit(1)
}

const run = await db.query(
  'insert into migration.runs (snapshot_file, snapshot_sha256) values ($1, $2) returning id',
  [path.basename(snapshotFile), sha]
)
const runId: number = run.rows[0].id

// ---------------------------------------------------------------- reset

step('Reset Supabase (pre-cutover only)')
const snapshotEmails = snap.users.map((u) => u.email.toLowerCase())
const known = await db.query(
  `select id from auth.users where id in (select supabase_user_id from migration.source_users)
   or lower(email) = any($1)`,
  [snapshotEmails]
)
const knownIds = new Set(known.rows.map((r) => r.id))
const strangers = await db.query('select id, email from auth.users where not (id = any($1::uuid[]))', [[...knownIds]])
if (strangers.rowCount) {
  // A login we did not create. Never delete it automatically.
  for (const s of strangers.rows) fail(`Supabase has a user this script did not create: ${s.email}`)
  await finish()
}
await db.query('begin')
for (const t of ['shares', 'transactions', 'people', 'accounts', 'categories', 'profiles']) {
  await db.query(`delete from public.${t}`)
}
await db.query('delete from migration.source_documents')
await db.query('delete from migration.source_users')
await db.query('commit')
for (const id of knownIds) {
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) fail(`could not delete previous-run user ${id}: ${error.message}`)
}
if (failures.length) await finish()
console.log(`  cleared tables, removed ${knownIds.size} users from a previous run`)

// ---------------------------------------------------------------- users

step('Create users with their Appwrite password hashes')
const userMap = new Map<string, string>() // appwrite id -> supabase id
for (const u of snap.users) {
  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password_hash: u.password,
    email_confirm: true,
    user_metadata: { name: u.name },
  })
  if (error || !data.user) {
    fail(`create user ${u.$id}: ${error?.message}`)
    continue
  }
  userMap.set(u.$id, data.user.id)
}
if (failures.length) await finish()
console.log(`  created ${userMap.size} users`)

// ---------------------------------------------------------------- data

step('Copy documents')
const isLive = (userId: string) => userMap.has(userId)
const live = {
  accounts: snap.collections.accounts.filter((d) => isLive(d.userId)),
  transactions: snap.collections.transactions.filter((d) => isLive(d.userId)),
  people: snap.collections.people.filter((d) => isLive(d.userId)),
  shares: snap.collections.shares.filter((d) => isLive(d.userId)),
  categories: snap.collections.categories.filter((d) => d.ownerId === '' || isLive(d.ownerId)),
}

const stamp = (d: Doc) => ({ id: d.$id, created_at: d.$createdAt, updated_at: d.$updatedAt })
const rows = {
  profiles: snap.users.map((u) => ({
    id: userMap.get(u.$id),
    name: u.name,
    default_currency: u.prefs?.defaultCurrency ?? 'BDT',
    appwrite_user_id: u.$id,
    created_at: u.$createdAt,
    updated_at: u.$updatedAt,
  })),
  categories: live.categories.map((d) => ({
    ...stamp(d),
    type: d.type,
    name: d.name,
    icon: d.icon,
    color: d.color,
    is_custom: d.isCustom,
    owner_id: d.ownerId === '' ? null : userMap.get(d.ownerId),
  })),
  accounts: live.accounts.map((d) => ({
    ...stamp(d),
    user_id: userMap.get(d.userId),
    name: d.name,
    type: d.type,
    currency: d.currency,
    is_default: d.isDefault,
  })),
  people: live.people.map((d) => ({
    ...stamp(d),
    user_id: userMap.get(d.userId),
    name: d.name,
    note: d.note,
    share_token: d.shareToken === '' ? null : d.shareToken,
  })),
  transactions: live.transactions.map((d) => ({
    ...stamp(d),
    user_id: userMap.get(d.userId),
    account_id: d.accountId,
    type: d.type,
    amount: d.amount,
    amount_minor: d.amountMinor,
    currency: d.currency,
    category_id: d.categoryId,
    payee: d.payee,
    note: d.note,
    date: d.date,
    from_account_id: d.fromAccountId || null,
    to_account_id: d.toAccountId || null,
    from_amount: d.fromAmount,
    from_amount_minor: d.fromAmountMinor,
    to_amount: d.toAmount,
    to_amount_minor: d.toAmountMinor,
    person_id: d.personId || null,
  })),
  shares: live.shares.map((d) => ({
    ...stamp(d),
    share_token: d.shareToken,
    person_name: d.personName,
    shared_by_name: d.sharedByName,
    person_id: d.personId,
    user_id: userMap.get(d.userId),
    data: d.data,
  })),
}

await db.query('begin')
try {
  // The signup trigger made an empty profile per user; replace it with the real one.
  await db.query('delete from public.profiles where id = any($1::uuid[])', [[...userMap.values()]])
  for (const table of ['profiles', 'categories', 'accounts', 'people', 'transactions', 'shares'] as const) {
    await db.query(
      `insert into public.${table} select * from jsonb_populate_recordset(null::public.${table}, $1::jsonb)`,
      [JSON.stringify(rows[table])]
    )
    console.log(`  ${table.padEnd(13)} ${rows[table].length}`)
  }
  await db.query(
    `insert into migration.source_users (appwrite_user_id, supabase_user_id, document)
     select x->>'appwrite_user_id', (x->>'supabase_user_id')::uuid, x->'document' from jsonb_array_elements($1::jsonb) x`,
    [JSON.stringify(snap.users.map((u) => ({ appwrite_user_id: u.$id, supabase_user_id: userMap.get(u.$id), document: u })))]
  )
  const sourceDocs = Object.entries(snap.collections).flatMap(([collection, docs]) =>
    docs.map((d) => ({
      collection,
      appwrite_id: d.$id,
      document: d,
      in_public_tables: (live as Record<string, Doc[]>)[collection].includes(d),
    }))
  )
  await db.query(
    `insert into migration.source_documents (collection, appwrite_id, document, in_public_tables)
     select x->>'collection', x->>'appwrite_id', x->'document', (x->>'in_public_tables')::boolean
     from jsonb_array_elements($1::jsonb) x`,
    [JSON.stringify(sourceDocs)]
  )
  const orphans = sourceDocs.filter((d) => !d.in_public_tables).length
  console.log(`  verbatim     ${sourceDocs.length} documents (${orphans} kept only here: owner no longer exists)`)
  await db.query('commit')
} catch (e) {
  await db.query('rollback')
  fail(`copy transaction rolled back: ${(e as Error).message}`)
  await finish()
}

// ---------------------------------------------------------------- verify

step('Verify: read everything back from Supabase')

/** node-pg gives Date for timestamptz and string for bigint; the app sees ISO strings and numbers. */
function normalize<T>(row: Doc): T {
  const out: Doc = {}
  for (const [k, v] of Object.entries(row)) out[k] = v instanceof Date ? v.toISOString() : v
  for (const k of ['amount_minor', 'from_amount_minor', 'to_amount_minor']) {
    if (typeof out[k] === 'string') out[k] = Number(out[k])
  }
  return out as T
}
const read = async <T>(sql: string) => (await db.query(sql)).rows.map((r) => normalize<T>(r))

const sameValue = (field: string, expected: unknown, actual: unknown) => {
  if (expected == null && actual == null) return true
  if (TIME_FIELDS.has(field)) return Date.parse(String(expected)) === Date.parse(String(actual))
  return expected === actual
}

const toSupabaseUser = (appwriteId: string) => (appwriteId === '' ? '' : userMap.get(appwriteId))

function compareCollection(name: string, expectedDocs: Doc[], actual: Doc[]) {
  const byId = new Map(actual.map((a) => [a.$id, a]))
  let fields = 0
  for (const d of expectedDocs) {
    const a = byId.get(d.$id)
    if (!a) {
      fail(`${name} ${d.$id} missing in Supabase`)
      continue
    }
    for (const [field, value] of Object.entries(d)) {
      if (APPWRITE_ONLY_FIELDS.has(field)) continue
      const expected = field === 'userId' || field === 'ownerId' ? toSupabaseUser(value) : value
      fields += 1
      if (!sameValue(field, expected, a[field])) {
        fail(`${name} ${d.$id}.${field}: Appwrite ${JSON.stringify(value)} vs Supabase ${JSON.stringify(a[field])}`)
      }
    }
    byId.delete(d.$id)
  }
  for (const extra of byId.keys()) fail(`${name} ${extra} exists in Supabase but not in the snapshot`)
  console.log(`  ${name.padEnd(13)} ${expectedDocs.length} rows, ${fields} fields compared`)
}

const accounts = (await read<AccountRow>('select * from public.accounts')).map(rowToAccount)
const transactions = (await read<TransactionRow>('select * from public.transactions')).map(rowToTransaction)
const people = (await read<PersonRow>('select * from public.people')).map(rowToPerson)
const categories = (await read<CategoryRow>('select * from public.categories')).map(rowToCategory)
const shares = (await read<Doc>('select * from public.shares')).map((r) => ({
  $id: r.id,
  $createdAt: r.created_at,
  $updatedAt: r.updated_at,
  shareToken: r.share_token,
  personName: r.person_name,
  sharedByName: r.shared_by_name,
  personId: r.person_id,
  userId: r.user_id,
  data: r.data,
}))

compareCollection('accounts', live.accounts, accounts)
compareCollection('transactions', live.transactions, transactions)
compareCollection('people', live.people, people)
compareCollection('categories', live.categories, categories)
compareCollection('shares', live.shares, shares)

step('Verify: balances computed by src/lib/calculations.ts')
const before = accountBalances(live.transactions as unknown as Transaction[])
const after = accountBalances(transactions)
for (const id of new Set([...Object.keys(before), ...Object.keys(after)])) {
  if (before[id] !== after[id]) fail(`balance of account ${id}: Appwrite ${before[id]} vs Supabase ${after[id]}`)
}
const asIs = (minor: number) => minor
const peopleBefore = peopleBalances(live.transactions as unknown as Transaction[], asIs)
const peopleAfter = peopleBalances(transactions, asIs)
for (const id of new Set([...Object.keys(peopleBefore), ...Object.keys(peopleAfter)])) {
  if (peopleBefore[id] !== peopleAfter[id]) fail(`balance with person ${id}: Appwrite ${peopleBefore[id]} vs Supabase ${peopleAfter[id]}`)
}
console.log(`  ${Object.keys(before).length} account balances and ${Object.keys(peopleBefore).length} person balances identical`)

step('Verify: users, passwords and profiles')
const authUsers = new Map(
  (await db.query('select id, email, encrypted_password, email_confirmed_at from auth.users')).rows.map((r) => [r.id, r])
)
const profiles = new Map((await read<Doc>('select * from public.profiles')).map((p) => [p.id, p]))
for (const u of snap.users) {
  const id = userMap.get(u.$id)!
  const a = authUsers.get(id)
  const p = profiles.get(id)
  if (!a) fail(`auth user for ${u.$id} missing`)
  else {
    if (a.email !== u.email.toLowerCase()) fail(`user ${u.$id} email differs`)
    if (a.encrypted_password !== u.password) fail(`user ${u.$id} password hash differs`)
    if (!a.email_confirmed_at) fail(`user ${u.$id} not confirmed, cannot log in`)
  }
  if (!p) fail(`profile for ${u.$id} missing`)
  else if (p.name !== u.name || p.default_currency !== (u.prefs?.defaultCurrency ?? 'BDT') || p.appwrite_user_id !== u.$id) {
    fail(`profile for ${u.$id} differs`)
  }
}
if (authUsers.size !== snap.users.length) fail(`Supabase has ${authUsers.size} users, snapshot ${snap.users.length}`)
console.log(`  ${snap.users.length} users: email, password hash, confirmation and profile checked`)

step('Verify: verbatim copies')
const canonical = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(canonical).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as Doc)[k])}`).join(',')}}`
      : JSON.stringify(v)
const stored = await db.query('select collection, appwrite_id, document from migration.source_documents')
const storedMap = new Map(stored.rows.map((r) => [`${r.collection}/${r.appwrite_id}`, r.document]))
let verbatim = 0
for (const [collection, docs] of Object.entries(snap.collections)) {
  for (const d of docs) {
    const s = storedMap.get(`${collection}/${d.$id}`)
    if (!s || canonical(s) !== canonical(d)) fail(`verbatim ${collection}/${d.$id} differs or is missing`)
    else verbatim += 1
  }
}
const storedUsers = await db.query('select appwrite_user_id, document from migration.source_users')
for (const u of snap.users) {
  const s = storedUsers.rows.find((r) => r.appwrite_user_id === u.$id)
  if (!s || canonical(s.document) !== canonical(u)) fail(`verbatim user ${u.$id} differs or is missing`)
  else verbatim += 1
}
console.log(`  ${verbatim} documents and users byte-for-byte equal (as JSON)`)

step('Verify: Appwrite unchanged since the snapshot')
const appwrite = await import('./lib/appwrite-readonly.mjs')
const fingerprint = (docs: Doc[]) => docs.map((d) => `${d.$id}@${d.$updatedAt}`).sort().join('|')
const nowUsers = await appwrite.listAllUsers()
if (fingerprint(nowUsers.rows) !== fingerprint(snap.users)) fail('Appwrite users changed after the snapshot was taken')
for (const c of appwrite.COLLECTIONS as (keyof Snapshot['collections'])[]) {
  const now = await appwrite.listAllDocuments(c)
  if (fingerprint(now.rows) !== fingerprint(snap.collections[c])) fail(`Appwrite ${c} changed after the snapshot was taken`)
}
console.log('  compared every id and $updatedAt')

await finish()

// ---------------------------------------------------------------- done

async function finish(): Promise<never> {
  const ok = failures.length === 0
  console.log(ok ? '\nALL CHECKS PASSED' : `\n${failures.length} PROBLEM(S):\n  ${failures.slice(0, 50).join('\n  ')}`)
  try {
    if (typeof runId !== 'undefined') {
      await db.query('update migration.runs set finished_at = now(), result = $2 where id = $1', [
        runId,
        JSON.stringify({ ok, failures }),
      ])
    }
    await db.end()
  } catch {
    // connection may not exist yet
  }
  process.exit(ok ? 0 : 1)
}
