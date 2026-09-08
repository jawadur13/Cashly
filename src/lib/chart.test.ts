import { describe, it, expect } from 'vitest'
import { CHART_HEIGHT, barHeightPx, chartScale } from './chart'

describe('chart geometry — issue #14', () => {
  const months = [
    { income: 60000, expense: 12000 },
    { income: 0, expense: 40000 },
    { income: 0, expense: 0 },
  ]
  const scale = chartScale(months.flatMap((m) => [m.income, m.expense]))

  it('scales to the tallest value in the series', () => {
    expect(scale).toBe(60000)
  })

  it('gives the tallest bar the full chart height', () => {
    expect(barHeightPx(60000, scale)).toBe(CHART_HEIGHT)
  })

  it('scales the rest proportionally', () => {
    expect(barHeightPx(30000, scale)).toBe(CHART_HEIGHT / 2)
    expect(barHeightPx(12000, scale)).toBe(24)
  })

  it('never exceeds the chart height, so a bar cannot overflow its box', () => {
    for (const m of months) {
      expect(barHeightPx(m.income, scale)).toBeLessThanOrEqual(CHART_HEIGHT)
      expect(barHeightPx(m.expense, scale)).toBeLessThanOrEqual(CHART_HEIGHT)
    }
  })

  it('keeps a tiny non-zero value visible instead of collapsing it', () => {
    expect(barHeightPx(1, scale)).toBe(2)
  })

  it('renders nothing for zero or negative', () => {
    expect(barHeightPx(0, scale)).toBe(0)
    expect(barHeightPx(-5, scale)).toBe(0)
  })

  it('survives an all-zero series without dividing by zero', () => {
    const s = chartScale([0, 0])
    expect(s).toBe(1)
    expect(barHeightPx(0, s)).toBe(0)
    expect(Number.isFinite(barHeightPx(0, s))).toBe(true)
  })

  it('two bars in one group can both be full height without overflowing', () => {
    // The old chart stacked them, so a month at the top of the scale needed
    // 200% of the box. Side by side, each is independently bounded.
    expect(barHeightPx(60000, scale)).toBe(CHART_HEIGHT)
    expect(barHeightPx(60000, scale)).toBe(CHART_HEIGHT)
  })
})
