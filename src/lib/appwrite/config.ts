export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? ''
export const COLLECTIONS = {
  accounts: 'accounts',
  transactions: 'transactions',
  categories: 'categories',
  people: 'people',
} as const
