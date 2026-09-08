/* Cashly — data integrity audit.

   Reports, and optionally repairs, the data problems the calculation audit
   turned up. NOTHING IS EVER DELETED by this script, with or without --apply.

   Run:  node scripts/audit-data.mjs              (report only — default)
         node scripts/audit-data.mjs --apply      (also write the safe repairs)

   Repairs performed under --apply:
     1. transaction.currency set to match its account's currency

   Reported but never auto-repaired (they need a human decision):
     2. transactions in a currency the app no longer supports
     3. transactions pointing at an account that no longer exists
     4. transfers whose two accounts disagree on currency (informational)

   Reads .env.local (APPWRITE_* values). Safe to re-run.
*/
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client, Databases, Query } from 'node-appwrite'

const APPLY = process.argv.includes('--apply')
const SUPPORTED = ['BDT', 'USD', 'EUR', 'GBP', 'INR', 'SAR', 'AED', 'MYR']

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

async function listAll(collectionId, queries = []) {
  const PAGE = 500
  const out = []
  let offset = 0
  for (;;) {
    const res = await db.listDocuments(databaseId, collectionId, [
      ...queries,
      Query.limit(PAGE),
      Query.offset(offset),
    ])
    out.push(...res.documents)
    offset += res.documents.length
    if (out.length >= res.total || res.documents.length === 0) break
  }
  return out
}

const money = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })

console.log(`\nCashly data audit — ${APPLY ? 'APPLY (will write repairs)' : 'REPORT ONLY (nothing will change)'}\n`)

const accounts = await listAll('accounts')
const transactions = await listAll('transactions')
const accountsById = new Map(accounts.map((a) => [a.$id, a]))

console.log(`Accounts:     ${accounts.length}`)
console.log(`Transactions: ${transactions.length}\n`)

/* ---------- 1. currency mismatch against the owning account ---------- */
const mismatched = []
for (const t of transactions) {
  const acc = accountsById.get(t.accountId)
  if (!acc) continue
  if (t.currency !== acc.currency) mismatched.push({ t, acc })
}

console.log(`[1] Transactions whose currency differs from their account: ${mismatched.length}`)
for (const { t, acc } of mismatched.slice(0, 25)) {
  console.log(
    `      ${t.$id}  ${String(t.date).slice(0, 10)}  ${t.type.padEnd(8)} ` +
    `${money(t.amount).padStart(12)}  stored as ${t.currency}  ->  account "${acc.name}" is ${acc.currency}`
  )
}
if (mismatched.length > 25) console.log(`      ... and ${mismatched.length - 25} more`)

if (mismatched.length > 0) {
  if (APPLY) {
    console.log('\n    Repairing (updating transaction.currency only) ...')
    let done = 0
    for (const { t, acc } of mismatched) {
      try {
        await db.updateDocument(databaseId, 'transactions', t.$id, { currency: acc.currency })
        done += 1
      } catch (e) {
        console.log(`      FAILED ${t.$id}: ${e.message}`)
      }
    }
    console.log(`    Repaired ${done} of ${mismatched.length}.`)
  } else {
    console.log('\n    Re-run with --apply to set each of these to its account currency.')
    console.log('    NOTE: this changes only the currency label, never the amount. Check the')
    console.log('    list above first — if an amount was genuinely entered in another currency,')
    console.log('    relabelling it will change what it is worth.')
  }
}

/* ---------- 2. unsupported currencies ---------- */
const unsupported = transactions.filter((t) => !SUPPORTED.includes(t.currency))
console.log(`\n[2] Transactions in an unsupported currency: ${unsupported.length}`)
const byCode = {}
for (const t of unsupported) byCode[t.currency] = (byCode[t.currency] ?? 0) + 1
for (const [code, n] of Object.entries(byCode)) console.log(`      ${code}: ${n}`)
if (unsupported.length > 0) {
  console.log('      Not auto-repaired — decide per currency whether to convert or re-enter.')
}

const unsupportedAccounts = accounts.filter((a) => !SUPPORTED.includes(a.currency))
if (unsupportedAccounts.length > 0) {
  console.log(`      Accounts in an unsupported currency: ${unsupportedAccounts.length}`)
  for (const a of unsupportedAccounts) console.log(`        "${a.name}" (${a.currency})`)
}

/* ---------- 3. transactions pointing at a missing account ---------- */
const orphans = transactions.filter((t) => {
  const ids = [t.accountId, t.fromAccountId, t.toAccountId].filter(Boolean)
  return ids.some((id) => !accountsById.has(id))
})
console.log(`\n[3] Transactions referencing a missing account: ${orphans.length}`)
for (const t of orphans.slice(0, 25)) {
  const missing = [t.accountId, t.fromAccountId, t.toAccountId]
    .filter(Boolean)
    .filter((id) => !accountsById.has(id))
  console.log(`      ${t.$id}  ${String(t.date).slice(0, 10)}  ${t.type.padEnd(8)} ${money(t.amount).padStart(12)}  missing: ${missing.join(', ')}`)
}
if (orphans.length > 25) console.log(`      ... and ${orphans.length - 25} more`)
if (orphans.length > 0) {
  console.log('      These count towards the Summary but not the Home balance.')
  console.log('      Not auto-repaired — reassign them to a real account in the app.')
}

/* ---------- 4. transfers across mismatched account currencies ---------- */
const badTransfers = transactions.filter((t) => {
  if (t.type !== 'exchange') return false
  const from = accountsById.get(t.fromAccountId)
  const to = accountsById.get(t.toAccountId)
  return from && to && from.currency !== to.currency
})
console.log(`\n[4] Transfers between accounts of different currencies: ${badTransfers.length}`)
for (const t of badTransfers.slice(0, 25)) {
  const from = accountsById.get(t.fromAccountId)
  const to = accountsById.get(t.toAccountId)
  console.log(`      ${t.$id}  ${String(t.date).slice(0, 10)}  ${from.name} (${from.currency}) -> ${to.name} (${to.currency})`)
}
if (badTransfers.length > 0) {
  console.log('      The form no longer allows these, but existing rows are handled:')
  console.log('      the summary values each leg in its own account currency, so the net')
  console.log('      effect is correct. Listed so you know they exist.')
}

const clean =
  mismatched.length === 0 && unsupported.length === 0 && orphans.length === 0 && badTransfers.length === 0
console.log(`\n${clean ? 'No problems found.' : 'Done. Nothing was deleted.'}\n`)
