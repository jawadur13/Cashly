/**
 * Full read-only snapshot of Appwrite: every user (with password hash, hash
 * options and prefs) and every document in every collection, verbatim.
 *
 *   node --env-file=.env.appwrite.local scripts/backup-appwrite.mjs [outDir]
 *
 * Writes <outDir>/appwrite-<timestamp>.json plus a .sha256 next to it, then
 * re-reads the file and checks it against fresh server counts. outDir defaults
 * to ../Cashly-backups so the snapshot (which contains password hashes) never
 * lands inside the repo.
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  COLLECTIONS,
  countDocuments,
  countUsers,
  databaseId,
  listAllDocuments,
  listAllUsers,
} from './lib/appwrite-readonly.mjs'

const outDir = path.resolve(process.argv[2] ?? path.join(process.cwd(), '..', 'Cashly-backups'))
const takenAt = new Date().toISOString()
const file = path.join(outDir, `appwrite-${takenAt.replace(/[:.]/g, '-')}.json`)

const users = await listAllUsers()
const collections = {}
for (const c of COLLECTIONS) collections[c] = await listAllDocuments(c)

const snapshot = {
  takenAt,
  source: {
    endpoint: process.env.APPWRITE_ENDPOINT ?? process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    projectId: process.env.APPWRITE_PROJECT_ID ?? process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    databaseId,
  },
  counts: {
    users: users.rows.length,
    ...Object.fromEntries(COLLECTIONS.map((c) => [c, collections[c].rows.length])),
  },
  users: users.rows,
  collections: Object.fromEntries(COLLECTIONS.map((c) => [c, collections[c].rows])),
}

// Every page must have come back: fetched rows must equal the server's total.
const problems = []
if (users.rows.length !== users.total) problems.push(`users fetched ${users.rows.length} of ${users.total}`)
for (const c of COLLECTIONS) {
  const { rows, total } = collections[c]
  if (rows.length !== total) problems.push(`${c} fetched ${rows.length} of ${total}`)
  if (new Set(rows.map((r) => r.$id)).size !== rows.length) problems.push(`${c} has duplicate ids`)
}
if (problems.length) {
  console.error('Snapshot incomplete, nothing written:\n  ' + problems.join('\n  '))
  process.exit(1)
}

await mkdir(outDir, { recursive: true })
const body = JSON.stringify(snapshot, null, 2)
const sha = createHash('sha256').update(body).digest('hex')
await writeFile(file, body, { flag: 'wx' })
await writeFile(`${file}.sha256`, `${sha}  ${path.basename(file)}\n`, { flag: 'wx' })

// Verify what is on disk, not what is in memory.
const reread = await readFile(file, 'utf8')
const rereadSha = createHash('sha256').update(reread).digest('hex')
const parsed = JSON.parse(reread)
const live = { users: await countUsers() }
for (const c of COLLECTIONS) live[c] = await countDocuments(c)

console.log(`Snapshot: ${file}`)
console.log(`sha256:   ${sha} ${rereadSha === sha ? '(verified on disk)' : '(MISMATCH)'}`)
let ok = rereadSha === sha
for (const [k, n] of Object.entries(parsed.counts)) {
  const same = n === live[k]
  ok &&= same
  console.log(`  ${k.padEnd(13)} ${String(n).padStart(5)}  live now ${String(live[k]).padStart(5)}  ${same ? 'OK' : 'CHANGED DURING BACKUP'}`)
}
process.exit(ok ? 0 : 1)
