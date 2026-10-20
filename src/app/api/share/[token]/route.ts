import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// The secret key bypasses Row Level Security, so this route is the only thing
// that decides what a share link reveals: one person's give/take rows, nothing else.
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const { data: share, error: shareError } = await supabase
    .from('shares')
    .select('person_name, shared_by_name, person_id, user_id, data')
    .eq('share_token', token)
    .maybeSingle()
  if (shareError) {
    return NextResponse.json({ error: 'Could not load share link' }, { status: 500 })
  }
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

  const PAGE_SIZE = 1000
  const transactions: { type: string; amountMinor: number; currency: string; date: string; note: string }[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data: page, error } = await supabase
      .from('transactions')
      .select('type, amount, amount_minor, currency, date, note')
      .eq('user_id', share.user_id)
      .eq('person_id', share.person_id)
      .in('type', ['give', 'take'])
      // `id` makes the sort total. `date` alone leaves ties unspecified, and
      // offset pagination assumes a total order.
      .order('date', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) {
      return NextResponse.json({ error: 'Could not load transactions' }, { status: 500 })
    }
    transactions.push(
      ...page.map((t) => ({
        type: t.type,
        // Minor units, falling back for rows written before the migration.
        amountMinor: t.amount_minor != null ? Number(t.amount_minor) : Math.round((t.amount ?? 0) * 100),
        currency: t.currency,
        date: t.date,
        note: t.note ?? '',
      }))
    )
    if (page.length < PAGE_SIZE) break
  }

  return NextResponse.json({
    personName: share.person_name,
    sharedByName: share.shared_by_name,
    currency,
    transactions,
  })
}
