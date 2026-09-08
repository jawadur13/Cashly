/* Cashly — remove leftover data from deleted and throwaway accounts.

   The database accumulated data from users that no longer exist (signed up,
   account later deleted, rows left behind) plus test and smoke-test sign-ups.
   None of it affects anyone's numbers — every query filters by userId — but it
   fills up the Accounts list in the console and shows up in every audit run.

   Run:  node scripts/cleanup-orphaned-data.mjs           (report only — default)
         node scripts/cleanup-orphaned-data.mjs --apply   (delete)

   THIS SCRIPT DELETES. It is the only one in the repo that does. Three
   safeguards:

     1. PROTECTED_USER_IDS below are never touched, under any flag.
     2. Any user whose account still exists and is not obviously a test
        sign-up is left alone and merely listed. Real people are not deleted
        just because they are not on the protected list.
     3. Nothing is deleted without --apply, and the report names every user
        and row count first.

   Take a backup before using --apply. Deletion cannot be undone.
   Reads .env.local (APPWRITE_* values).
*/
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client, Databases, Users, Query } from 'node-appwrite'

const APPLY = process.argv.includes('--apply')

/** Never deleted, whatever else happens. */
const PROTECTED_USER_IDS = new Set([
  '6a6e5bbb00183ee77365', // jawadurrafidrafid@gmail.com
  '6a6f82850034967e9fca', // hasanimam72108@gmail.com
])

/** A sign-up that is plainly disposable. Anything else that still exists is kept. */
const isThrowaway = (email) =>
  /@example\.com$/i.test(email) || /^cashly-smoke-/i.test(email) || email === 'test@gmail.com'

const __dirname = dirname(fileURLToPath(import.meta.url))
const env = {}
for (const line of readFileSync(resolve(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/)) {
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
const users = new Users(client)

const COLLECTIONS = ['transactions', 'accounts', 'people', 'shares']

async function listAll(collectionId) {
  const PAGE = 500
  const out = []
  let offset = 0
  for (;;) {
    const res = await db.listDocuments(databaseId, collectionId, [
      Query.limit(PAGE),
      Query.offset(offset),
    ])
    out.push(...res.documents)
    offset += res.documents.length
    if (out.length >= res.total || res.documents.length === 0) break
  }
  return out
}

console.log(`\nCleanup — ${APPLY ? 'APPLY (WILL DELETE)' : 'REPORT ONLY (nothing will change)'}\n`)

const data = {}
for (const c of COLLECTIONS) data[c] = await listAll(c)

const userIds = new Set()
for (const c of COLLECTIONS) for (const d of data[c]) if (d.userId) userIds.add(d.userId)

const keep = []
const remove = []
for (const id of userIds) {
  const counts = Object.fromEntries(COLLECTIONS.map((c) => [c, data[c].filter((d) => d.userId === id).length]))
  if (PROTECTED_USER_IDS.has(id)) {
    keep.push({ id, label: 'PROTECTED', counts })
    continue
  }
  let email = null
  try {
    email = (await users.get(id)).email || '(no email)'
  } catch {
    email = null // user no longer exists
  }
  if (email === null) remove.push({ id, label: 'deleted user — data orphaned', counts })
  else if (isThrowaway(email)) remove.push({ id, label: `throwaway sign-up (${email})`, counts })
  else keep.push({ id, label: `real user (${email})`, counts })
}

const fmt = (c) => COLLECTIONS.map((k) => `${c[k]} ${k}`).join(', ')

console.log('KEEPING')
for (const u of keep) console.log(`  ${u.id}  ${u.label}\n      ${fmt(u.counts)}`)

console.log('\nREMOVING')
if (remove.length === 0) console.log('  (nothing)')
for (const u of remove) console.log(`  ${u.id}  ${u.label}\n      ${fmt(u.counts)}`)

const totals = Object.fromEntries(
  COLLECTIONS.map((c) => [c, remove.reduce((n, u) => n + u.counts[c], 0)])
)
console.log(`\n  total to delete: ${fmt(totals)}`)

if (remove.length === 0) {
  console.log('\nNothing to do.\n')
} else if (!APPLY) {
  console.log('\nRe-run with --apply to delete. Take a backup first — this cannot be undone.\n')
} else {
  const removeIds = new Set(remove.map((u) => u.id))
  // Belt and braces: re-check the protected set at the point of deletion.
  for (const id of PROTECTED_USER_IDS) {
    if (removeIds.has(id)) {
      console.error(`REFUSING: protected user ${id} appeared in the delete set. Aborting.`)
      process.exit(1)
    }
  }

  console.log('\nDeleting ...')
  let deleted = 0
  let failed = 0
  for (const c of COLLECTIONS) {
    const docs = data[c].filter((d) => removeIds.has(d.userId))
    for (const d of docs) {
      try {
        await db.deleteDocument(databaseId, c, d.$id)
        deleted += 1
      } catch (e) {
        failed += 1
        console.log(`   FAILED ${c}/${d.$id}: ${e.message}`)
      }
    }
    console.log(`   ${c}: ${docs.length} removed`)
  }
  console.log(`\nDeleted ${deleted} documents. ${failed} failed.\n`)
}
