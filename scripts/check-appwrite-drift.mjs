/**
 * Lists everything that changed in Appwrite after a snapshot was taken:
 * documents and users created, edited or deleted. Read-only.
 *
 *   node --env-file=.env.appwrite.local scripts/check-appwrite-drift.mjs <snapshot.json>
 *
 * Run it after cutover. Until every user's browser has loaded the Supabase
 * build, someone can still write through the old one, and those writes land
 * only in Appwrite. Anything listed here has to be carried over by hand.
 * Exit code 0 means nothing changed.
 */
import { readFileSync } from 'node:fs'
import { COLLECTIONS, listAllDocuments, listAllUsers } from './lib/appwrite-readonly.mjs'

const file = process.argv[2]
if (!file) {
  console.error('usage: check-appwrite-drift.mjs <snapshot.json>')
  process.exit(2)
}
const snap = JSON.parse(readFileSync(file, 'utf8'))

function diff(label, before, after) {
  const was = new Map(before.map((d) => [d.$id, d]))
  const changes = []
  for (const d of after) {
    const old = was.get(d.$id)
    if (!old) changes.push(`created  ${label}/${d.$id}`)
    else if (old.$updatedAt !== d.$updatedAt) changes.push(`edited   ${label}/${d.$id}`)
    was.delete(d.$id)
  }
  for (const id of was.keys()) changes.push(`deleted  ${label}/${id}`)
  return changes
}

const changes = diff('users', snap.users, (await listAllUsers()).rows)
for (const c of COLLECTIONS) changes.push(...diff(c, snap.collections[c], (await listAllDocuments(c)).rows))

console.log(`Snapshot taken ${snap.takenAt}`)
console.log(changes.length ? `${changes.length} change(s) since:\n  ${changes.join('\n  ')}` : 'No changes in Appwrite since the snapshot.')
process.exit(changes.length ? 1 : 0)
