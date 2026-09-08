import { NextResponse } from 'next/server'
import { Client, Databases, Query } from 'node-appwrite'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/config'

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!)

const databases = new Databases(client)

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const shareRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.shares, [
    Query.equal('shareToken', token),
    Query.limit(1),
  ])
  const share = shareRes.documents[0]
  if (!share) {
    return NextResponse.json({ error: 'Share link not found' }, { status: 404 })
  }

  let currency = 'BDT'
  try {
    const parsed = JSON.parse(share.data || '{}')
    if (parsed.currency) currency = parsed.currency
  } catch {
    // fall back to BDT on malformed data
  }

  const PAGE_SIZE = 500
  const transactions: { type: string; amountMinor: number; currency: string; date: string; note: string }[] = []
  let offset = 0
  let total = 0
  do {
    const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.transactions, [
      Query.equal('userId', share.userId),
      Query.equal('personId', share.personId),
      Query.equal('type', ['give', 'take']),
      Query.orderDesc('date'),
      Query.limit(PAGE_SIZE),
      Query.offset(offset),
    ])
    transactions.push(
      ...res.documents.map((t) => ({
        type: t.type,
        // Minor units, falling back for rows written before the migration.
        amountMinor: t.amountMinor ?? Math.round((t.amount ?? 0) * 100),
        currency: t.currency,
        date: t.date,
        note: t.note,
      }))
    )
    total = res.total
    offset += res.documents.length
  } while (offset < total)

  return NextResponse.json({
    personName: share.personName,
    sharedByName: share.sharedByName,
    currency,
    transactions,
  })
}
