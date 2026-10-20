import { describe, expect, it } from 'vitest'
import { transactionsToCsv } from './export'
import type { Transaction } from './types'

const base: Transaction = {
  $id: 't1',
  $createdAt: '',
  $updatedAt: '',
  userId: 'u',
  accountId: 'cash',
  type: 'expense',
  amount: 0,
  amountMinor: 123450,
  currency: 'BDT',
  categoryId: 'food',
  payee: 'Shwapno',
  note: 'Rice, "atta", oil',
  date: '2026-10-01T09:00:00.000Z',
}
const labels = {
  accountName: (id: string | undefined) => ({ cash: 'Cash', bank: 'City Bank' })[id ?? ''] ?? '',
  categoryName: (id: string) => ({ food: 'Food' })[id] ?? 'Uncategorized',
  personName: (id: string | undefined) => ({ p1: 'Rafi' })[id ?? ''] ?? '',
}

describe('transactionsToCsv', () => {
  const csv = transactionsToCsv(
    [
      base,
      { ...base, $id: 't2', type: 'exchange', categoryId: '', payee: '', note: '', amountMinor: 5580, fromAccountId: 'bank', toAccountId: 'cash', fromAmountMinor: 405580, toAmountMinor: 400000 },
      { ...base, $id: 't3', type: 'give', categoryId: '', personId: 'p1', payee: '', note: '=HYPERLINK("x")', amountMinor: 500000 },
    ],
    labels
  )
  const lines = csv.replace(/^﻿/, '').split('\r\n')

  it('writes exact decimal amounts from minor units', () => {
    expect(lines[1]).toContain(',1234.50,BDT,')
    expect(lines[2]).toContain(',4055.80,4000')
  })

  it('quotes commas and quotes, and neutralises formulas', () => {
    expect(lines[1]).toContain('"Rice, ""atta"", oil"')
    expect(lines[3]).toContain(`"'=HYPERLINK(""x"")"`)
  })

  it('names accounts, categories and people', () => {
    expect(lines[1]).toContain('Expense,Cash,Food,,Shwapno')
    expect(lines[2]).toContain('Transfer,Cash,,,')
    expect(lines[2]).toContain('City Bank,Cash,')
    expect(lines[3]).toContain('Give,Cash,,Rafi')
  })
})
