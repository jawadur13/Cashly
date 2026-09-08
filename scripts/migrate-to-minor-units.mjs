/* Cashly — backfill whole-minor-unit amounts.

   Copies each transaction's float `amount` into the integer `amountMinor`
   (and the same for fromAmount/toAmount). NOTHING IS DELETED. The float
   columns are left exactly as they are, so this is reversible: if anything
   looks wrong, clear the *Minor columns and the app falls back to the floats.

   The app reads `amountMinor ?? round(amount * 100)`, so it gives identical
   answers before and after this runs. There is no downtime and no ordering
   requirement against a deploy.

   Run:  node scripts/migrate-to-minor-units.mjs             (report only)
         node scripts/migrate-to-minor-units.mjs --apply     (write the backfill)

   Idempotent: rows that already carry a correct *Minor value are skipped.
   Reads .env.local (APPWRITE_* values).
*/
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client, Databases, Query } from 'node-appwrite'

const APPLY = process.argv.includes('--apply')

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

/** Same rule as src/lib/money.ts — keep these in step. */
const toMinor = (major) => Math.round((major ?? 0) * 100)

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

console.log(`\nBackfill minor units — ${APPLY ? 'APPLY (will write)' : 'REPORT ONLY (nothing will change)'}\n`)

const transactions = await listAll('transactions')
console.log(`Transactions: ${transactions.length}`)

const pending = []
const drifted = []

for (const t of transactions) {
  const patch = {}

  const wantAmount = toMinor(t.amount)
  if (t.amountMinor == null) patch.amountMinor = wantAmount
  else if (t.amountMinor !== wantAmount) drifted.push({ t, field: 'amount', stored: t.amountMinor, expected: wantAmount })

  if (t.fromAmount != null) {
    const want = toMinor(t.fromAmount)
    if (t.fromAmountMinor == null) patch.fromAmountMinor = want
    else if (t.fromAmountMinor !== want) drifted.push({ t, field: 'fromAmount', stored: t.fromAmountMinor, expected: want })
  }

  if (t.toAmount != null) {
    const want = toMinor(t.toAmount)
    if (t.toAmountMinor == null) patch.toAmountMinor = want
    else if (t.toAmountMinor !== want) drifted.push({ t, field: 'toAmount', stored: t.toAmountMinor, expected: want })
  }

  if (Object.keys(patch).length > 0) pending.push({ id: t.$id, patch, t })
}

console.log(`Already backfilled: ${transactions.length - pending.length}`)
console.log(`Needing backfill:   ${pending.length}\n`)

for (const { id, patch, t } of pending.slice(0, 20)) {
  console.log(`   ${id}  ${String(t.date).slice(0, 10)}  ${String(t.type).padEnd(8)}  ${JSON.stringify(patch)}`)
}
if (pending.length > 20) console.log(`   ... and ${pending.length - 20} more`)

/* A stored integer disagreeing with its float means something wrote one column
   without the other. Never silently overwrite that — a human must look. */
if (drifted.length > 0) {
  console.log(`\n!! ${drifted.length} row(s) have a minor value that disagrees with the float column:`)
  for (const d of drifted.slice(0, 20)) {
    console.log(`   ${d.t.$id}  ${d.field}: stored ${d.stored}, float implies ${d.expected}`)
  }
  console.log('   These are NOT touched. Check them by hand before trusting the totals.')
}

if (pending.length === 0) {
  console.log('\nNothing to do.\n')
  process.exit(0)
}

if (!APPLY) {
  console.log('\nRe-run with --apply to write the values above.')
  console.log('The float columns are left untouched either way.\n')
  process.exit(0)
}

console.log('\nWriting ...')
let done = 0
let failed = 0
for (const { id, patch } of pending) {
  try {
    await db.updateDocument(databaseId, 'transactions', id, patch)
    done += 1
    if (done % 100 === 0) console.log(`   ${done}/${pending.length}`)
  } catch (e) {
    failed += 1
    console.log(`   FAILED ${id}: ${e.message}`)
  }
}

console.log(`\nBackfilled ${done} of ${pending.length}. ${failed} failed.`)
console.log('The float columns were not modified, so this can be re-run safely.\n')
