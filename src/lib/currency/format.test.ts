import { describe, expect, it } from 'vitest'
import { dayKey, formatCompact, formatDayHeading, formatMoney, formatSignedMoney, MINUS, moneyParts } from './format'

// Intl output varies slightly by runtime (spacing, currency marker), so the
// tests assert on the parts that matter: the figure, decimals and sign.
const figure = (s: string) => s.replace(/[^\d.,−+-]/g, '')

describe('formatMoney decimals', () => {
  it('shows no decimals for whole amounts', () => {
    expect(figure(formatMoney(300000, 'BDT'))).toBe('3,000')
  })

  it('always shows two decimals when there are paisa', () => {
    // ৳1,626.40 — never ৳1,626.4
    expect(figure(formatMoney(162640, 'BDT'))).toBe('1,626.40')
    expect(figure(formatMoney(1250, 'USD'))).toBe('12.50')
  })

  it("can force two decimals so a column's decimals line up", () => {
    expect(figure(formatMoney(300000, 'BDT', { decimals: 'always' }))).toBe('3,000.00')
  })

  it('uses a true minus sign for negatives', () => {
    const out = formatMoney(-65000, 'BDT')
    expect(out.startsWith(MINUS) || out.includes(MINUS)).toBe(true)
    expect(out).not.toContain('-')
  })
})

describe('formatSignedMoney', () => {
  it('signs by direction, not by the stored value', () => {
    expect(formatSignedMoney(500, 'BDT', 'income').startsWith('+')).toBe(true)
    expect(formatSignedMoney(500, 'BDT', 'take').startsWith('+')).toBe(true)
    expect(formatSignedMoney(500, 'BDT', 'expense').startsWith(MINUS)).toBe(true)
    expect(formatSignedMoney(-500, 'BDT', 'give').startsWith(MINUS)).toBe(true)
    expect(formatSignedMoney(500, 'BDT', 'exchange')).toBe(formatMoney(500, 'BDT'))
  })
})

describe('moneyParts', () => {
  it('splits the currency marker from the figure', () => {
    const p = moneyParts(43716634, 'BDT')
    expect(p.number).toBe('437,166.34')
    expect(p.currency.length).toBeGreaterThan(0)
    expect(p.sign).toBe('')
  })

  it('carries the sign separately', () => {
    const p = moneyParts(-1420500, 'BDT')
    expect(p.sign).toBe(MINUS)
    expect(p.number).toBe('14,205')
  })
})

describe('day grouping', () => {
  const now = new Date(2026, 9, 20, 15, 0)

  it('names today and yesterday', () => {
    expect(formatDayHeading(new Date(2026, 9, 20, 1, 0), now)).toBe('Today')
    expect(formatDayHeading(new Date(2026, 9, 19, 23, 59), now)).toBe('Yesterday')
  })

  it('keys by local calendar day', () => {
    expect(dayKey(new Date(2026, 9, 5, 0, 1))).toBe('2026-10-05')
  })

  it('adds the year only for other years', () => {
    expect(formatDayHeading(new Date(2025, 0, 3), now)).toMatch(/2025/)
    expect(formatDayHeading(new Date(2026, 0, 3), now)).not.toMatch(/2026/)
  })
})

describe('formatCompact', () => {
  it('shortens large figures for chart axes', () => {
    expect(formatCompact(8500000)).toBe('85K')
    expect(formatCompact(12500000000)).toBe('125M')
    expect(formatCompact(0)).toBe('0')
  })
})
