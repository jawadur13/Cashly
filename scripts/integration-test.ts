/**
 * End-to-end check of the app's Supabase data layer against the real project,
 * signed in as a throwaway user that is deleted at the end. Touches only that
 * user's rows; reads nobody else's (and proves it cannot).
 *
 *   npx vite-node --config vitest.config.ts scripts/integration-test.ts
 */
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

process.loadEnvFile('.env.supabase.local')
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

let passed = 0
const failures: string[] = []
function check(name: string, ok: boolean, detail = '') {
  if (ok) passed += 1
  else failures.push(`${name}${detail ? `: ${detail}` : ''}`)
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${name}${!ok && detail ? ` (${detail})` : ''}`)
}
async function rejects(fn: () => Promise<unknown>) {
  try {
    await fn()
    return false
  } catch {
    return true
  }
}

const email = `cashly-it-${Date.now()}@example.com`
const password = `It-${randomBytes(12).toString('hex')}`
const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name: 'Integration Test' },
})
if (createError || !created.user) throw new Error(`could not create test user: ${createError?.message}`)
const userId = created.user.id

try {
  const { supabase } = await import('../src/lib/supabase/client')
  const data = await import('../src/lib/supabase/data')
  const { accountBalances } = await import('../src/lib/calculations')
  const { GET: shareRoute } = await import('../src/app/api/share/[token]/route')

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) throw new Error(`sign-in failed: ${signInError.message}`)

  console.log('Profile')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single()
  check('signup trigger created a profile with the name', profile?.name === 'Integration Test')

  console.log('Isolation (Row Level Security)')
  const { data: visibleAccounts } = await supabase.from('accounts').select('user_id')
  check('sees no other user\'s accounts', (visibleAccounts ?? []).every((a) => a.user_id === userId))
  const { data: visibleTx } = await supabase.from('transactions').select('id')
  check('sees no other user\'s transactions', (visibleTx ?? []).length === 0)
  const { data: visibleProfiles } = await supabase.from('profiles').select('id')
  check('sees only its own profile', visibleProfiles?.length === 1)
  const { data: someoneElse } = await admin.from('profiles').select('id').neq('id', userId).limit(1)
  if (someoneElse?.length) {
    const { error } = await supabase
      .from('accounts')
      .insert({ user_id: someoneElse[0].id, name: 'x', type: 'cash', currency: 'BDT' })
    check('cannot create a row owned by someone else', !!error)
  }
  const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  })
  const { data: anonRows } = await anon.from('transactions').select('id')
  check('signed-out visitors read nothing', (anonRows ?? []).length === 0)

  console.log('Accounts')
  const cash = await data.createAccount({ userId, name: 'Cash', type: 'cash', currency: 'BDT', isDefault: true })
  const bank = await data.createAccount({ userId, name: 'Bank', type: 'bank', currency: 'BDT' })
  const usd = await data.createAccount({ userId, name: 'Wallet', type: 'cash', currency: 'USD' })
  check('create and list', (await data.listAccounts(userId)).length === 3)
  const renamed = await data.updateAccount(bank.$id, { name: 'City Bank' })
  check('rename', renamed.name === 'City Bank')
  const { error: currencyError } = await supabase.from('accounts').update({ currency: 'USD' }).eq('id', bank.$id)
  check('database refuses an account currency change', !!currencyError)

  console.log('Transactions')
  const t1 = await data.createTransaction({
    userId, accountId: cash.$id, type: 'income', amountMinor: 1_000_050, currency: 'BDT',
    categoryId: 'salary', payee: 'Acme, Inc. (50%)', note: 'October', date: '2026-10-01T09:00:00.000Z',
  })
  check('amount stored in both columns', t1.amountMinor === 1_000_050 && t1.amount === 10000.5)
  await data.createTransaction({
    userId, accountId: cash.$id, type: 'expense', amountMinor: 25_075, currency: 'BDT',
    categoryId: 'food', note: 'lunch', date: '2026-10-02T09:00:00.000Z',
  })
  await data.createTransaction({
    userId, accountId: cash.$id, type: 'exchange', amountMinor: 100_000, currency: 'BDT', categoryId: '',
    date: '2026-10-03T09:00:00.000Z', fromAccountId: cash.$id, toAccountId: bank.$id,
    fromAmountMinor: 100_000, toAmountMinor: 100_000,
  })
  const person = await data.createPerson({ userId, name: 'Rafi' })
  await data.createTransaction({
    userId, accountId: cash.$id, type: 'give', amountMinor: 5_000, currency: 'BDT', categoryId: '',
    date: '2026-10-04T09:00:00.000Z', personId: person.$id,
  })

  const all = await data.listTransactions({ userId, limit: 50 })
  check('list returns all four with a total', all.documents.length === 4 && all.total === 4)
  check('newest first', all.documents[0].type === 'give')
  const balances = accountBalances(all.documents)
  check('cash balance', balances[cash.$id] === 1_000_050 - 25_075 - 100_000 - 5_000, String(balances[cash.$id]))
  check('bank balance', balances[bank.$id] === 100_000, String(balances[bank.$id]))

  const page2 = await data.listTransactions({ userId, limit: 3, offset: 3 })
  check('offset pagination', page2.documents.length === 1 && page2.total === 4)
  const searched = await data.listTransactions({ userId, search: 'acme, inc. (50%' })
  check('search with commas, brackets and % is literal', searched.documents.length === 1)
  const wildcard = await data.listTransactions({ userId, search: '%' })
  check('% alone does not match everything', wildcard.documents.length === 1)
  const byCat = await data.listTransactions({ userId, categoryIds: ['food'] })
  check('filter by category', byCat.documents.length === 1)
  const inRange = await data.listTransactions({ userId, from: '2026-10-02T00:00:00.000Z', to: '2026-10-03T23:59:59.999Z' })
  check('filter by date range', inRange.documents.length === 2)

  const edited = await data.updateTransaction(t1.$id, { amountMinor: 999_999, note: 'edited' })
  check('edit keeps both amount columns in step', edited.amountMinor === 999_999 && edited.amount === 9999.99)
  check('fetch one', (await data.getTransaction(t1.$id)).note === 'edited')
  const cleared = await data.updateTransaction(t1.$id, { personId: '' })
  check("'' clears a reference instead of breaking it", cleared.personId === undefined)

  console.log('Never orphan a transaction')
  check('deleting an account with transactions is refused', await rejects(() => data.deleteAccount(cash.$id)))
  check(
    'moving to another currency is refused',
    await rejects(() => data.reassignAndDeleteAccount(userId, bank.$id, usd.$id))
  )
  const { moved } = await data.reassignAndDeleteAccount(userId, cash.$id, bank.$id)
  const after = await data.listTransactions({ userId, limit: 50 })
  check('reassign moves every transaction, then deletes', moved === 4 && after.total === 4)
  check(
    'no transaction points at the deleted account',
    after.documents.every((t) => t.accountId !== cash.$id && t.fromAccountId !== cash.$id && t.toAccountId !== cash.$id)
  )

  console.log('Categories')
  const cats = await data.listCategories(userId)
  check('predefined categories visible', cats.some((c) => c.$id === 'food' && c.ownerId === ''))
  const custom = await data.createCategory({ userId, type: 'expense', name: 'Pets', icon: 'paw-print' })
  check('custom category', (await data.listCategories(userId)).some((c) => c.$id === custom.$id))
  const { error: predefinedDelete } = await supabase.from('categories').delete().eq('id', 'food').select()
  const { data: foodStill } = await supabase.from('categories').select('id').eq('id', 'food')
  check('cannot delete a predefined category', !predefinedDelete && foodStill?.length === 1)
  await data.deleteCategory(custom.$id)

  console.log('Share links')
  const token = await data.generateShareToken(person.$id, person.name, 'Integration Test', userId, 'BDT')
  const res = await shareRoute(new Request('http://x'), { params: Promise.resolve({ token }) })
  const body = await res.json()
  check(
    'share route returns only that person\'s give/take',
    res.status === 200 && body.transactions.length === 1 && body.transactions[0].amountMinor === 5_000
  )
  await data.removeShareToken(person.$id, userId)
  const gone = await shareRoute(new Request('http://x'), { params: Promise.resolve({ token }) })
  check('removed link stops working', gone.status === 404)
  const [reloaded] = (await data.listPeople(userId)).filter((p) => p.$id === person.$id)
  check('person no longer marked shared', reloaded.shareToken === undefined)

  console.log('Delete all my data')
  await data.deleteUserData(userId)
  const { count } = await supabase.from('transactions').select('id', { count: 'exact', head: true })
  check('removes everything in foreign-key order', count === 0 && (await data.listAccounts(userId)).length === 0)

  await supabase.auth.signOut()
} catch (e) {
  failures.push(`crashed: ${(e as Error).message}`)
  console.error(e)
} finally {
  // Same order the app uses, then the profile, then the login itself.
  for (const t of ['transactions', 'shares', 'people', 'accounts']) await admin.from(t).delete().eq('user_id', userId)
  await admin.from('categories').delete().eq('owner_id', userId)
  await admin.from('profiles').delete().eq('id', userId)
  const { error } = await admin.auth.admin.deleteUser(userId)
  console.log(`\nTest user ${error ? `NOT removed: ${error.message}` : 'removed'}`)
}

console.log(failures.length ? `\n${failures.length} FAILED:\n  ${failures.join('\n  ')}` : `\nALL ${passed} CHECKS PASSED`)
process.exit(failures.length ? 1 : 0)
