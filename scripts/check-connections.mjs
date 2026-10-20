/**
 * Connection check for the Supabase migration. Changes no data in either database.
 *
 *   node --env-file=.env.appwrite.local --env-file=.env.supabase.local scripts/check-connections.mjs
 *
 * Appwrite is reached only through lib/appwrite-readonly.mjs (counts only).
 * Supabase: validates both API keys and opens a Postgres session.
 */
import { createClient } from '@supabase/supabase-js'
import pg from 'pg'
import { COLLECTIONS, countDocuments, countUsers } from './lib/appwrite-readonly.mjs'

let failed = false
const ok = (msg) => console.log(`  OK    ${msg}`)
const bad = (msg) => {
  failed = true
  console.log(`  FAIL  ${msg}`)
}

async function checkAppwrite() {
  console.log('Appwrite (source, read-only)')
  try {
    ok(`users: ${await countUsers()}`)
  } catch (e) {
    bad(`users: ${e.message}`)
  }
  for (const c of COLLECTIONS) {
    try {
      ok(`${c}: ${await countDocuments(c)} documents`)
    } catch (e) {
      bad(`${c}: ${e.message}`)
    }
  }
}

async function checkSupabase() {
  console.log('Supabase (destination)')
  const env = process.env
  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY },
    })
    if (res.ok) ok('publishable key accepted')
    else bad(`publishable key rejected: HTTP ${res.status}`)
  } catch (e) {
    bad(`project URL unreachable: ${e.message}`)
  }
  try {
    const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
    if (error) bad(`secret key: ${error.message}`)
    else ok(`secret key accepted (auth users: ${data.users.length ? 'some' : 'none'})`)
  } catch (e) {
    bad(`secret key: ${e.message}`)
  }
  const db = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } })
  try {
    await db.connect()
    const v = await db.query('select version()')
    const t = await db.query(
      "select count(*)::int as n from information_schema.tables where table_schema = 'public'"
    )
    ok(`database connected: ${v.rows[0].version.split(' ').slice(0, 2).join(' ')}, ${t.rows[0].n} tables in public`)
  } catch (e) {
    bad(`database: ${e.message}`)
  } finally {
    await db.end().catch(() => {})
  }
}

await checkAppwrite()
await checkSupabase()
console.log(failed ? '\nSome checks failed.' : '\nAll checks passed.')
process.exit(failed ? 1 : 0)
