const { readFileSync } = require('fs')
const { Client, Account, Databases, ID, Query, Users, Permission, Role } = require('node-appwrite')

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}

const endpoint = env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const projectId = env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
const databaseId = env.NEXT_PUBLIC_APPWRITE_DATABASE_ID
const apiKey = env.APPWRITE_API_KEY

const admin = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey)
const adminDb = new Databases(admin)
const adminAccount = new Account(admin)
const adminUsers = new Users(admin)

const email = `smoke-${Date.now()}@cashly.test`
const password = 'SmokeTest123!'

async function main() {
  // 1. Create a user (mimics signUp)
  const user = await adminAccount.create(ID.unique(), email, password, 'Smoke Tester')
  console.log('created user', user.$id)

  // 2. Create an email/password session (mimics signIn)
  const session = await adminAccount.createEmailPasswordSession(email, password)
  console.log('created session', session.$id)

  // 3. Build a user-scoped client with the session token
  const userClient = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setSession(session.secret)
  const userAccount = new Account(userClient)
  const userDb = new Databases(userClient)

  // 4. Seed prefs + default accounts (mimics seedNewUser)
  const ownerPerms = (uid) => [
    Permission.read(Role.user(uid)),
    Permission.update(Role.user(uid)),
    Permission.delete(Role.user(uid)),
  ]
  await userAccount.updatePrefs({ defaultCurrency: 'BDT' })
  for (const acc of [
    { name: 'Cash', type: 'cash' },
    { name: 'Bank', type: 'bank' },
    { name: 'bKash', type: 'mobile-wallet' },
    { name: 'Nagad', type: 'mobile-wallet' },
  ]) {
    await userDb.createDocument(databaseId, 'accounts', ID.unique(), {
      userId: user.$id,
      name: acc.name,
      type: acc.type,
      currency: 'BDT',
      isDefault: true,
    }, ownerPerms(user.$id))
  }
  console.log('seeded 4 default accounts')

  // 5. List accounts as the user
  const accounts = await userDb.listDocuments(databaseId, 'accounts', [
    Query.equal('userId', user.$id),
  ])
  console.log('accounts visible to user:', accounts.total)

  // 6. Read predefined categories (seeded with read-only Role.users())
  const categories = await userDb.listDocuments(databaseId, 'categories', [Query.equal('type', 'expense')])
  console.log('predefined expense categories visible:', categories.total)

  // 7. Create a transaction
  const foodCat = categories.documents.find((c) => c.$id === 'food')
  const created = await userDb.createDocument(databaseId, 'transactions', ID.unique(), {
    userId: user.$id,
    accountId: accounts.documents[0].$id,
    type: 'expense',
    amount: 125.5,
    currency: 'BDT',
    categoryId: foodCat.$id,
    payee: 'Kacchi Bhai',
    note: 'Lunch',
    date: new Date().toISOString(),
  }, ownerPerms(user.$id))
  console.log('created transaction', created.$id)

  // 8. Search by note via fulltext index
  const searchRes = await userDb.listDocuments(databaseId, 'transactions', [
    Query.equal('userId', user.$id),
    Query.search('note', 'Lunch'),
  ])
  console.log('note search found:', searchRes.total)

  // 9. Cross-user isolation check: a second user must NOT see the first user's data
  const email2 = `smoke2-${Date.now()}@cashly.test`
  const user2 = await adminAccount.create(ID.unique(), email2, password, 'Smoke Tester 2')
  const session2 = await adminAccount.createEmailPasswordSession(email2, password)
  const user2Client = new Client().setEndpoint(endpoint).setProject(projectId).setSession(session2.secret)
  const user2Db = new Databases(user2Client)
  const user2Sees = await user2Db.listDocuments(databaseId, 'accounts', [
    Query.equal('userId', user.$id),
  ])
  console.log('user2-visible accounts of user1 (expect 0):', user2Sees.total)

  // 10. Cleanup: delete the test users
  await adminUsers.delete(user2.$id)
  await adminUsers.delete(user.$id)
  console.log('deleted test users')
}

main()
  .then(() => console.log('SMOKE TEST PASSED'))
  .catch((e) => {
    console.error('SMOKE TEST FAILED:', e.message)
    process.exit(1)
  })
