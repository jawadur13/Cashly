import { describe, expect, it } from 'vitest'
import { rowToCategory, rowToPerson, rowToTransaction, type TransactionRow } from './mappers'

const stamps = { created_at: '2026-08-01T19:25:49.383+00:00', updated_at: '2026-08-02T10:00:00.000+00:00' }

const transfer: TransactionRow = {
  id: 'tx1',
  user_id: 'u1',
  account_id: 'a1',
  type: 'exchange',
  amount: 12.34,
  amount_minor: 1234,
  currency: 'BDT',
  category_id: '',
  payee: '',
  note: 'rent',
  date: '2026-08-01T19:25:47.544+00:00',
  from_account_id: 'a1',
  to_account_id: 'a2',
  from_amount: 12.34,
  from_amount_minor: 1234,
  to_amount: 12.34,
  to_amount_minor: 1234,
  person_id: null,
  ...stamps,
}

describe('rowToTransaction', () => {
  it('maps a transfer to the domain shape', () => {
    expect(rowToTransaction(transfer)).toEqual({
      $id: 'tx1',
      $createdAt: stamps.created_at,
      $updatedAt: stamps.updated_at,
      userId: 'u1',
      accountId: 'a1',
      type: 'exchange',
      amount: 12.34,
      amountMinor: 1234,
      currency: 'BDT',
      categoryId: '',
      payee: '',
      note: 'rent',
      date: transfer.date,
      fromAccountId: 'a1',
      toAccountId: 'a2',
      fromAmount: 12.34,
      fromAmountMinor: 1234,
      toAmount: 12.34,
      toAmountMinor: 1234,
      personId: undefined,
    })
  })

  it('reads bigint minor units that arrive as strings as numbers', () => {
    const row = { ...transfer, amount_minor: '1234' as unknown as number }
    expect(rowToTransaction(row).amountMinor).toBe(1234)
  })

  it('leaves absent transfer legs undefined so the legacy fallbacks apply', () => {
    const t = rowToTransaction({
      ...transfer,
      type: 'expense',
      from_account_id: null,
      to_account_id: null,
      from_amount: null,
      from_amount_minor: null,
      to_amount: null,
      to_amount_minor: null,
    })
    expect(t.fromAccountId).toBeUndefined()
    expect(t.fromAmountMinor).toBeUndefined()
  })
})

describe('rowToCategory', () => {
  it("gives predefined categories the '' owner the app filters on", () => {
    const c = rowToCategory({
      id: 'food',
      type: 'expense',
      name: 'Food',
      icon: 'utensils',
      color: null,
      is_custom: false,
      owner_id: null,
      ...stamps,
    })
    expect(c.ownerId).toBe('')
    expect(c.color).toBeNull()
  })
})

describe('rowToPerson', () => {
  it('treats a missing share token as not shared', () => {
    const p = rowToPerson({ id: 'p1', user_id: 'u1', name: 'Rafi', note: null, share_token: null, ...stamps })
    expect(p.shareToken).toBeUndefined()
    expect(p.note).toBe('')
  })
})
