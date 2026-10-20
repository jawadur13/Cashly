/**
 * Sets a new temporary password for one Supabase user and prints it, for
 * resetting a password by hand while the project has no custom SMTP.
 *
 *   node --env-file=.env.supabase.local scripts/set-user-password.mjs user@example.com
 *
 * Send the printed password to the user over a private channel and ask them to
 * change it after logging in.
 */
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const email = process.argv[2]?.trim().toLowerCase()
if (!email) {
  console.error('usage: set-user-password.mjs <email>')
  process.exit(2)
}

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

let user = null
for (let page = 1; !user; page += 1) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
  if (error) throw new Error(error.message)
  user = data.users.find((u) => u.email?.toLowerCase() === email) ?? null
  if (data.users.length < 200) break
}
if (!user) {
  console.error(`No Cashly user with email ${email}`)
  process.exit(1)
}

// Readable but strong: 16 characters from an unambiguous alphabet.
const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
const password = [...randomBytes(16)].map((b) => alphabet[b % alphabet.length]).join('')

const { error } = await admin.auth.admin.updateUserById(user.id, { password })
if (error) throw new Error(error.message)
console.log(`Temporary password for ${email}: ${password}`)
