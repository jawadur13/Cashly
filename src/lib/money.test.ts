import { describe, it, expect } from 'vitest'
import {
  fromMinorUnits,
  minorToInputValue,
  readAmountMinor,
  readFromAmountMinor,
  readToAmountMinor,
  toMinorUnits,
} from './money'
import type { Transaction } from './types'

describe('toMinorUnits', () => {
  it('converts whole and decimal major units', () => {
    expect(toMinorUnits('0')).toBe(0)
    expect(toMinorUnits('1')).toBe(100)
    expect(toMinorUnits('123.45')).toBe(12345)
    expect(toMinorUnits('0.07')).toBe(7)
    expect(toMinorUnits('1000000')).toBe(100000000)
  })

  it('pads a single decimal place', () => {
    expect(toMinorUnits('1.5')).toBe(150)
    expect(toMinorUnits('.5')).toBe(50)
  })

  it('rounds a third decimal place rather than truncating', () => {
    expect(toMinorUnits('1.004')).toBe(100)
    expect(toMinorUnits('1.005')).toBe(101)
    expect(toMinorUnits('1.006')).toBe(101)
  })

  it('handles the float midpoint that Math.round gets wrong', () => {
    // Math.round(1.005 * 100) === 100, because 1.005 is really 1.00499...
    expect(Math.round(1.005 * 100)).toBe(100)
    expect(toMinorUnits('1.005')).toBe(101)
  })

  it('handles signs and blanks', () => {
    expect(toMinorUnits('-12.34')).toBe(-1234)
    expect(toMinorUnits('')).toBe(0)
    expect(toMinorUnits('   ')).toBe(0)
  })

  it('accepts a number as well as a string', () => {
    expect(toMinorUnits(123.45)).toBe(12345)
    expect(toMinorUnits(0)).toBe(0)
  })

  it('never returns NaN for junk input', () => {
    expect(toMinorUnits('abc')).toBe(0)
    expect(toMinorUnits(Number.NaN)).toBe(0)
    expect(toMinorUnits(Infinity)).toBe(0)
  })
})

describe('minor units survive arithmetic that breaks floats', () => {
  it('adds exactly where decimal major units drift', () => {
    expect(0.1 + 0.2).not.toBe(0.3) // the reason this module exists
    expect(toMinorUnits('0.1') + toMinorUnits('0.2')).toBe(toMinorUnits('0.3'))
  })

  it('stays exact over a long run of additions', () => {
    let float = 0
    let minor = 0
    for (let i = 0; i < 1000; i += 1) {
      float += 0.07
      minor += toMinorUnits('0.07')
    }
    expect(minor).toBe(7000)
    expect(float).not.toBe(70) // drifts
    expect(fromMinorUnits(minor)).toBe(70)
  })
})

describe('minorToInputValue', () => {
  it('round-trips through toMinorUnits without losing value', () => {
    // The formatting may differ ("1.5" renders as "1.50"); the value must not.
    for (const v of ['0', '1', '123.45', '0.07', '1.5', '-12.34', '1000000']) {
      expect(toMinorUnits(minorToInputValue(toMinorUnits(v)))).toBe(toMinorUnits(v))
    }
  })

  it('drops the decimals when there are none', () => {
    expect(minorToInputValue(100)).toBe('1')
    expect(minorToInputValue(0)).toBe('0')
  })

  it('keeps two decimals when there is a fraction', () => {
    expect(minorToInputValue(12345)).toBe('123.45')
    expect(minorToInputValue(7)).toBe('0.07')
  })
})

describe('reading amounts from rows written before the migration', () => {
  const legacy = { amount: 123.45, fromAmount: 10.5, toAmount: 9.8 } as Transaction
  const migrated = {
    amount: 123.45, amountMinor: 12345,
    fromAmount: 10.5, fromAmountMinor: 1050,
    toAmount: 9.8, toAmountMinor: 980,
  } as Transaction

  it('falls back to the float column when the integer one is absent', () => {
    expect(readAmountMinor(legacy)).toBe(12345)
    expect(readFromAmountMinor(legacy)).toBe(1050)
    expect(readToAmountMinor(legacy)).toBe(980)
  })

  it('prefers the integer column once it exists', () => {
    expect(readAmountMinor(migrated)).toBe(12345)
    expect(readFromAmountMinor(migrated)).toBe(1050)
    expect(readToAmountMinor(migrated)).toBe(980)
  })

  it('gives the same answer either way, so migration changes no totals', () => {
    expect(readAmountMinor(legacy)).toBe(readAmountMinor(migrated))
  })

  it('treats missing transfer amounts as zero', () => {
    expect(readFromAmountMinor({} as Transaction)).toBe(0)
    expect(readToAmountMinor({} as Transaction)).toBe(0)
  })
})
