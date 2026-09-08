<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:money-rules -->
# Money rules

Every figure in this app is money someone acts on. These invariants are what keep the Home, Summary, People and share screens agreeing with each other; each one exists because breaking it produced a real wrong number. The full history is in `CALCULATION-AUDIT.md` — read it before changing anything that touches an amount.

- **Amounts are whole minor units (paisa), never decimal taka.** Parse input with `toMinorUnits`, display with `formatMoney`. Never do arithmetic on `amount`; read `amountMinor` through `readAmountMinor` / `readFromAmountMinor` / `readToAmountMinor`, which fall back to the legacy float column. Both columns are written on save — keep it that way.
- **A transaction's currency is always its account's currency.** Do not add a currency picker to the transaction form, and do not make account currency editable. Balances are bare numbers that take their currency from the account.
- **Never orphan a transaction.** Deleting an account reassigns its transactions to another account of the same currency. No code path may delete a transaction as a side effect of something else.
- **Periods are calendar periods.** Use `monthPeriod` / `previousMonthPeriod` / `yearPeriod` / `previousYearPeriod`. Never derive a period by subtracting a fixed number of milliseconds.
- **Convert per leg, not per difference.** A transfer's two sides are valued in their own account currencies before subtracting.
- **Rising is not always good.** Trend colour is chosen per metric — up is good for income and savings, bad for expense.
- **Currency conversion rounds back to whole minor units** (`convertMinor`), or fractional paisa leak into the totals.
- **Only add a currency with a 100-minor-unit subunit.** JPY, KWD and similar would require `MINOR_UNITS_PER_MAJOR` to become per-currency.

Calculations live as pure functions in `src/lib` (`calculations.ts`, `money.ts`, `chart.ts`), not inside hooks, so they are testable without rendering. Keep new logic there and cover it: `npm test`.

The balances, summary, people and person-detail screens share one copy of the transaction history via `all-transactions-provider.tsx`. Anything that writes a transaction must call its `refresh`.
<!-- END:money-rules -->
