/**
 * Bar geometry for the cash-flow chart.
 *
 * Heights are resolved to pixels here rather than left as CSS percentages. The
 * bars previously used `height: <n>%` inside a column whose own height was
 * undefined (the row is `items-end`, so columns size to their content), which
 * browsers resolve to zero. Returning pixels removes the dependency on the
 * parent's height entirely.
 */
export const CHART_HEIGHT = 120

/** Tallest single value across the series, never below 1 to avoid dividing by zero. */
export function chartScale(values: number[]): number {
  return Math.max(...values, 1)
}

/**
 * Pixel height for one bar. Zero and negative values render nothing; anything
 * positive gets at least 2px so a small month is still visible.
 */
export function barHeightPx(value: number, scale: number, chartHeight = CHART_HEIGHT): number {
  if (value <= 0) return 0
  return Math.max(2, Math.round((value / scale) * chartHeight))
}
