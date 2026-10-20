/**
 * Applies supabase/migrations/*.sql to the Supabase database, in name order,
 * each in its own transaction. Applied files are recorded in
 * migration.schema_migrations and skipped next time.
 *
 *   node --env-file=.env.supabase.local scripts/apply-schema.mjs
 */
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const dir = path.join(process.cwd(), 'supabase', 'migrations')
const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()

const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } })
await db.connect()

const tracked = await db.query("select to_regclass('migration.schema_migrations') as t")
const applied = new Set(
  tracked.rows[0].t ? (await db.query('select name from migration.schema_migrations')).rows.map((r) => r.name) : []
)

try {
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip    ${file}`)
      continue
    }
    const sql = await readFile(path.join(dir, file), 'utf8')
    await db.query('begin')
    try {
      await db.query(sql)
      await db.query('create table if not exists migration.schema_migrations (name text primary key, applied_at timestamptz not null default now())')
      await db.query('insert into migration.schema_migrations (name) values ($1)', [file])
      await db.query('commit')
      console.log(`applied ${file}`)
    } catch (e) {
      await db.query('rollback')
      throw new Error(`${file}: ${e.message}`)
    }
  }
} finally {
  await db.end()
}
