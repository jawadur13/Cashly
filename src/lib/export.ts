/**
 * CSV export of the full transaction history. Amounts come from the integer
 * minor-unit columns and are written as exact decimal strings — never through
 * floating point — so the file adds up to the same totals as the app.
 */
import { minorToInputValue, readAmountMinor, readFromAmountMinor, readToAmountMinor } from './money'
import type { Transaction } from './types'

export interface ExportLabels {
  accountName: (id: string | undefined) => string
  categoryName: (id: string) => string
  personName: (id: string | undefined) => string
}

const TYPE_NAMES: Record<Transaction['type'], string> = {
  income: 'Income',
  expense: 'Expense',
  exchange: 'Transfer',
  give: 'Give',
  take: 'Get',
}

const HEADER = ['Date', 'Type', 'Account', 'Category', 'Person', 'Payee', 'Note', 'Amount', 'Currency', 'From account', 'To account', 'Amount sent', 'Amount received']

function cell(value: string): string {
  // Quote everything that could break a row; neutralise spreadsheet formulas.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\n\r]/.test(safe) || safe !== value ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function transactionsToCsv(transactions: Transaction[], labels: ExportLabels): string {
  const rows = transactions.map((t) => {
    const isTransfer = t.type === 'exchange'
    return [
      t.date,
      TYPE_NAMES[t.type],
      labels.accountName(t.accountId),
      isTransfer || t.type === 'give' || t.type === 'take' ? '' : labels.categoryName(t.categoryId),
      t.personId ? labels.personName(t.personId) : '',
      t.payee ?? '',
      t.note ?? '',
      minorToInputValue(readAmountMinor(t)),
      t.currency,
      isTransfer ? labels.accountName(t.fromAccountId) : '',
      isTransfer ? labels.accountName(t.toAccountId) : '',
      isTransfer ? minorToInputValue(readFromAmountMinor(t)) : '',
      isTransfer ? minorToInputValue(readToAmountMinor(t)) : '',
    ].map((v) => cell(String(v)))
  })
  // A BOM so Excel opens UTF-8 (৳, names) correctly.
  return '﻿' + [HEADER.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
}
