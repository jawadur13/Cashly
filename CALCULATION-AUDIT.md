# Calculation Logic Audit — Cashly

**Date:** 2026-09-05
**Scope:** Every money path end-to-end — write path (form → Appwrite), account balances, people/debt balances, the Summary dashboard, currency conversion, and the public share page
**Method:** Static trace of every formula + numeric verification + read-only reconciliation against live Appwrite data
**Status:** ✅ RESOLVED per your comments — 14 fixed, 4 kept as-is by your decision, 2 left open.
No data was written, modified, or deleted at any point.

> **How to use this doc:** each finding has a `<!-- USER_COMMENT: -->` slot at the end.
> Write your decision inside it (fix / skip / do it differently) and I'll work from that.

---

## Executive Summary

The **F1–F14 fixes from the previous audit all landed correctly** — I verified each one and
they hold. The shared `signedCashDelta` convention, give/take exclusion from P&L, the
People↔Summary sign agreement, local-time period boundaries, and the exchange-rate
provider are all working as designed.

The problems are in **code written after that audit** (the summary dashboard, commit
`0d46b99`) plus **two structural gaps that were never covered**.

**One bug is producing wrong money on live data right now.**

| Severity | Count | Meaning |
|---|---|---|
| 🔴 Critical | 1 | Invents money that does not exist; confirmed in your live database |
| 🟠 High | 5 | Visibly wrong numbers or wrong colours on the Summary page |
| 🟡 Medium | 7 | Correct today, silently wrong at the edges |
| 🔵 Low | 6 | Cosmetic, performance, or latent |

### Live reconciliation result

I pulled all 222 transactions across 11 users and re-ran the app's own formulas:

```
Home page total  vs  Summary "All time" closing balance

  10 of 11 users ....... RECONCILES exactly (drift 0.00)
   1 of 11 users ....... *** MISMATCH: -27,384.00 BDT ***
```

That single mismatch is finding **C-1** below.

---

## 🔴 CRITICAL

### ✅ C-1 — Cross-currency exchange subtracts two different currencies

**Files:** [use-summary.ts:185](src/hooks/use-summary.ts#L185), [use-summary.ts:196](src/hooks/use-summary.ts#L196)

```ts
exchNet += toDefault((t.toAmount ?? 0) - (t.fromAmount ?? 0), t.currency)
```

`fromAmount` is denominated in the **source account's** currency and `toAmount` in the
**destination account's** currency. The code subtracts them as if they were the same unit,
then converts the meaningless difference using a single `t.currency`. The `Transaction`
schema has only one `currency` field, so there is no per-side currency to consult.

**This is live in your database.** User `6a70dcd700` has one such row:

```
  2 USD  →  224 BDT      (stored currency = USD)

  app computes : convert(224 - 2 = 222, USD → BDT)  =  +27,361.50 BDT "gain"
  truth        : 224 BDT - 2 USD (=246.50 BDT)      =       -22.50 BDT  (a small loss)
  ------------------------------------------------------------------------
  INVENTED     :                                        27,384.00 BDT
```

That is the exact drift between this user's Home total (233,964.50) and their Summary
all-time closing balance (261,348.50). The Summary page shows them 27,384 BDT they
do not have, and reports a loss as a large gain.

**How the row got there:** the transaction form's same-currency guard was committed in
`823b8d8` at `2026-08-04 19:38 UTC`; this row was created at `2026-08-04 18:38 UTC` —
one hour earlier. So the guard blocks *new* cross-currency exchanges, but **the reading
code has no defence at all**, and finding H-5 below is a live path that recreates this state.

**Suggested fix:** derive each side's currency from its account rather than from `t.currency`.
The summary hook already loads accounts elsewhere; pass an `accountId → currency` map in
and compute each leg independently:

```ts
const fromCur = accountCurrency[t.fromAccountId] ?? t.currency
const toCur   = accountCurrency[t.toAccountId]   ?? t.currency
exchNet += toDefault(t.toAmount ?? 0, toCur) - toDefault(t.fromAmount ?? 0, fromCur)
```

Apply the same change to the opening-balance branch at line 185. This is correct for
same-currency exchanges too, so it needs no special-casing. **It also repairs the existing
bad row on read without touching the database** — no migration, no data edit.

<!-- USER_COMMENT: fix it -->

---

## 🟠 HIGH

### ✅ H-1 — Previous-period comparison window is wrong for 10 of 12 months

**Files:** [summary/page.tsx:70](src/app/app/summary/page.tsx#L70), [summary/page.tsx:75-78](src/app/app/summary/page.tsx#L75-L78)

`previousOffset` is the **length of the previous month**, and `use-summary.ts:212` subtracts
it from *both* ends of the window:

```ts
const prev = aggregate(start - previousOffset, end - previousOffset)
```

Subtracting a previous-month-length from the current month's *end* only lands on the right
date when both months happen to be the same length. Verified for every month of 2026:

| Month | Comparison window used | Should be | |
|---|---|---|---|
| Jan | Dec 1 → Dec 31 | Dec 1 → Dec 31 | ok |
| Feb | Dec 31 → **Jan 28** | Dec 31 → Jan 31 | **wrong** |
| Mar | Jan 31 → **Mar 3** | Jan 31 → Feb 28 | **wrong** |
| Apr | Feb 28 → **Mar 30** | Feb 28 → Mar 31 | **wrong** |
| May | Mar 31 → **May 1** | Mar 31 → Apr 30 | **wrong** |
| … | | | |
| Aug | Jun 30 → Jul 31 | Jun 30 → Jul 31 | ok |

**10 of 12 months are wrong.** March is the clearest failure: the "previous period" runs to
**March 3rd**, so the first three days of the month being viewed are counted *inside* its own
comparison baseline. Every trend badge on the Summary page is computed against the
wrong window.

**Suggested fix:** stop using a millisecond offset. Pass explicit previous-period bounds:

```ts
// SummaryRange gains: previousStart: number | null, previousEnd: number | null
// month scope:
previousStart: new Date(y, m - 2, 1).getTime(),
previousEnd:   new Date(y, m - 1, 1).getTime(),
```

Calendar arithmetic via the `Date` constructor is immune to month lengths, leap years,
and DST — a fixed ms offset is none of those things.

<!-- USER_COMMENT:fix it  -->

---

### ✅ H-2 — Year-over-year comparison broken by leap years

**File:** [summary/page.tsx:64](src/app/app/summary/page.tsx#L64)

```ts
previousOffset: 365 * 24 * 60 * 60 * 1000
```

Verified:

| Viewing | Compares against | Should be | |
|---|---|---|---|
| 2024 | Dec 31 2022 → **Jan 1 2024** | Jan 1 2023 → Jan 1 2024 | **wrong** |
| 2025 | **Jan 1 2024** → Dec 31 2024 | Jan 1 2024 → Jan 1 2025 | **wrong** |
| 2026 | Jan 1 2025 → Jan 1 2026 | ✓ | ok |

Any year adjacent to a leap year silently drops or double-counts a day at the boundary.

**Suggested fix:** same as H-1 — `new Date(year - 1, 0, 1)` / `new Date(year, 0, 1)`.

<!-- USER_COMMENT:fix  -->

---

### ✅ H-3 — Expense trend badge turns green when spending rises

**File:** [summary/page.tsx:234-236](src/app/app/summary/page.tsx#L234-L236)

```ts
const up = trend > 0
… up ? 'bg-income-soft text-income' : 'bg-expense-soft text-expense'
```

The colour is keyed to the *sign of the number*, not to whether the change is good for the
user. Verified:

```
  expense 1000 → 1500   badge: GREEN ↑ 50%   (spending ROSE   — bad)
  expense 1000 →  600   badge: RED   ↓ 40%   (spending FELL   — good)
```

Rising spending is congratulated in green; cutting spending is flagged red. Income and
savings are correct — only expense is inverted, because for expense the desirable direction
is down.

**Suggested fix:** give each badge its own "good direction" rather than sharing one rule:

```ts
const badge = (label: string, trend: number | null, goodWhenUp: boolean) => {
  const good = trend === 0 ? null : (trend > 0) === goodWhenUp
  …
}
badge('Income',  incomeTrend,  true)
badge('Expense', expenseTrend, false)   // ← down is good
badge('Savings', savingsTrend, true)
```

Keep the arrow pointing at the actual direction of change; only the colour flips.

<!-- USER_COMMENT: fix it -->

---

### ✅ H-4 — Savings trend inverts when the previous period was a loss

**File:** [use-summary.ts:216](src/hooks/use-summary.ts#L216)

```ts
savingsTrend = prev.savings !== 0 ? ((curr.savings - prev.savings) / prev.savings) * 100 : …
```

A negative denominator flips the sign of the percentage. Verified:

```
  prev -100 → curr  -50   loss HALVED   (improved)  →  badge RED   ↓ 50%
  prev -100 → curr -200   loss DOUBLED  (worsened)  →  badge GREEN ↑ 100%
```

Exactly backwards. A user who cut their overspend in half is told they got worse.

**Suggested fix:** divide by the magnitude, so the numerator alone carries direction:

```ts
((curr.savings - prev.savings) / Math.abs(prev.savings)) * 100
```

<!-- USER_COMMENT: fix it -->

---

### ✅ H-5 — An account's currency can be changed after it has transactions

**Files:** [account-form.tsx:79](src/components/accounts/account-form.tsx#L79), [collections.ts:38](src/lib/appwrite/collections.ts#L38), [accounts/page.tsx:89-96](src/app/app/accounts/page.tsx#L89-L96)

The edit sheet renders the same currency `<Select>` as the create sheet, and `updateAccount`
accepts `currency` with no guard and no migration of existing rows.

Flip a BDT account to USD and every historical transaction in it is retroactively
reinterpreted: balances are re-scaled by ~123×, and every exchange that account
participated in becomes a cross-currency row — **which is exactly the state that produces
C-1.** This is the live path by which the critical bug can reappear after it is fixed.

**Suggested fix:** lock the currency once an account has any transaction. Reuse the
existing count call, and disable rather than hide so the reason is visible:

```tsx
<Select … disabled={isEditing && txnCount > 0} />
{isEditing && txnCount > 0 && (
  <p className="mt-1 text-xs text-text-tertiary">
    Currency is locked — this account has {txnCount} transactions.
  </p>
)}
```

Note the count call needs the H-6/M-1 fix first, or it will read 0 for exchange-only accounts.

<!-- USER_COMMENT: lock it -->

---

### ✅ H-6 — Account balances sum mixed currencies without converting

**File:** [use-account-balances.ts:43](src/hooks/use-account-balances.ts#L43), [use-account-balances.ts:59-65](src/hooks/use-account-balances.ts#L59-L65)

```ts
map[t.accountId] = (map[t.accountId] ?? 0) + signedCashDelta(t)   // raw amount, t.currency ignored
…
convertCurrency(balance, a.currency, defaultCurrency, rates)      // whole balance treated as a.currency
```

A transaction's `amount` is added to its account's running total **without converting from
`t.currency` to the account's currency**, and the total is then converted as if the whole
balance were in the account's currency. A BDT account holding one USD-denominated row
reports a number that is neither BDT nor USD:

```
  BDT account: +10,000 BDT income, -50 USD expense
    app shows      :  9,950.00 BDT
    actually holds :  3,837.50 BDT
    overstated by  :  6,112.50 BDT
```

**Currently clean in your data** — the reconciliation found 0 mismatched rows, because
`effectiveCurrency` pins new transactions to the account's currency. But two live paths
break that: **H-5** (changing the account's currency), and the fact that on **edit**
`effectiveCurrency = currency`, making the currency dropdown freely editable for an
existing transaction while the account stays put.

**Suggested fix:** convert at accumulation time — one line, and it makes the invariant
hold regardless of how the row was created:

```ts
const accountCurrency = accountById[t.accountId]?.currency ?? t.currency
map[t.accountId] = (map[t.accountId] ?? 0)
  + convertCurrency(signedCashDelta(t), t.currency, accountCurrency, rates)
```

<!-- USER_COMMENT: fix -->

---

## 🟡 MEDIUM

### ✅ M-1 — Account delete guard doesn't see exchange legs

**Files:** [collections.ts:49-59](src/lib/appwrite/collections.ts#L49-L59), [accounts/page.tsx:35](src/app/app/accounts/page.tsx#L35)

`countTransactionsByAccount` filters on `accountId` only. An account that appears solely as
an exchange's `toAccountId` reports **0 transactions**, so the delete dialog reassures the
user it is empty. Delete it and the exchange row survives with a dangling reference: its
`toAmount` leg still accumulates into `balances[toAccountId]`, but that account is no longer
in `accounts`, so the Home total's reduce skips it — **the money silently disappears from
the total** while the transaction still shows in the list.

**Suggested fix:** count all three reference columns.

```ts
Query.or([
  Query.equal('accountId', accountId),
  Query.equal('fromAccountId', accountId),
  Query.equal('toAccountId', accountId),
])
```

<!-- USER_COMMENT: yes -->

---

### ✅ M-2 — Offset pagination sorts on a non-unique key

**File:** [collections.ts:190](src/lib/appwrite/collections.ts#L190)

```ts
Query.orderDesc('date')
```

Every balance hook pages through transactions with `limit`/`offset` ordered by `date` alone.
`date` is not unique, and rows that compare equal have no guaranteed order between two
separate queries — so a row sitting on a page boundary can be returned twice or skipped
entirely, directly corrupting a balance.

**Live exposure:** your largest user has **35 groups of identical timestamps, up to 4 rows
each**. Today every user fits in one 500-row page so the boundary is never crossed, but the
hazard is real the moment anyone exceeds 500 transactions.

**Suggested fix:** add a unique tiebreaker so the sort is total.

```ts
Query.orderDesc('date'), Query.orderDesc('$id')
```

<!-- USER_COMMENT: yes -->

---

### ✅ M-3 — Pagination loops can spin forever

**Files:** [use-account-balances.ts:30-35](src/hooks/use-account-balances.ts#L30-L35), [use-people.ts:31-45](src/hooks/use-people.ts#L31-L45), [use-summary.ts:147-152](src/hooks/use-summary.ts#L147-L152), [api/share/[token]/route.ts:39-59](src/app/api/share/[token]/route.ts#L39-L59)

```ts
do { … offset += res.documents.length } while (offset < total)
```

If a page ever returns 0 documents while `offset < total` — a permission filter, a row
deleted mid-pagination, an Appwrite hiccup — `offset` stops advancing and the loop spins
forever, hanging the tab (or the server route).

**Suggested fix:** break on an empty page. The share route already does this; the three
client hooks do not.

```ts
if (res.documents.length === 0) break
```

<!-- USER_COMMENT: fix it -->

---

### ✅ M-4 — Unknown currency codes silently pass through unconverted

**File:** [currencies.ts:80](src/lib/currency/currencies.ts#L80)

```ts
if (fromRate == null || toRate == null) return amount
```

An unrecognised code returns the raw number, which then gets summed as if it were the
target currency. A stray `"usd"` or a currency dropped from `CURRENCIES` becomes a silent
1:1 conversion — no error, no warning, just a wrong total.

**Suggested fix:** keep the graceful return so nothing crashes, but make it visible —
`console.warn` in dev, and surface unconvertible rows in the UI rather than folding them in.

<!-- USER_COMMENT: do it -->

---

### ⏸️ M-5 (kept as-is, your call) — "Exchange" cannot actually exchange currencies

**Files:** [transaction-form.tsx:119](src/components/transactions/transaction-form.tsx#L119), [transaction-form.tsx:127](src/components/transactions/transaction-form.tsx#L127), [transaction-form.tsx:227](src/components/transactions/transaction-form.tsx#L227)

```ts
const sameCurrencyExchange = fromAccount && toAccount && fromAccount.currency === toAccount.currency
… if (…&& !sameCurrencyExchange) next.toAccountId = 'Both accounts must use the same currency'
```

The destination dropdown filters to same-currency accounts and validation rejects the rest.
In a multi-currency app, the feature named "Exchange" is really a **same-currency transfer**
— the one operation an exchange exists to perform is blocked. Your live data shows a user
tried exactly this (2 USD → 224 BDT) before the guard existed.

This is the guard that currently *contains* C-1. Worth deciding deliberately: keep the
restriction and rename the feature "Transfer", or lift the restriction **after** C-1 and H-6
are fixed, at which point cross-currency exchange computes correctly.

**Suggested fix (my recommendation):** fix C-1 + H-6 first, then lift the restriction and show
the implied rate under the amount fields (`1 USD = 112.00 BDT`) so the user can sanity-check
the swap. Renaming to "Transfer" is the cheaper option if cross-currency isn't wanted.

<!-- USER_COMMENT: keep ot as it is -->

---

### ✅ M-6 — Cash-flow chart bars can overflow their container

**File:** [summary/page.tsx:297-302](src/app/app/summary/page.tsx#L297-L302)

Income and expense bars are stacked in a 120px column and **each** sized as a percentage of
`maxBar`, which is the max of either series. A month where income and expense are both
near the peak renders `100% + 100%` inside a 120px box — the bars overflow and the chart
misrepresents the data.

**Suggested fix:** either scale against the per-month total (`m.income + m.expense`) so a
stacked column can never exceed 100%, or put the two bars side by side in a row, which is
the more conventional read for income-vs-expense.

<!-- USER_COMMENT: fix it -->

---

### ⏸️ M-7 (kept as-is, your call) — Appwrite's offset ceiling silently truncates long histories

**File:** [collections.ts:203](src/lib/appwrite/collections.ts#L203)

Appwrite caps `Query.offset` at 5,000. Past that, pagination stops returning rows and every
balance in the app quietly becomes a partial sum — with no error surfaced.

Far from your current volume (222 rows), but it is a silent-wrong-number failure rather
than a visible one, which makes it worth handling before it matters.

**Suggested fix:** switch the balance hooks to cursor pagination
(`Query.cursorAfter(lastId)`), which has no ceiling and also sidesteps M-2 entirely.

<!-- USER_COMMENT: keep it as it is now.. i will switch to supabase later -->

---

## 🔵 LOW

### ✅ L-1 — 12-month chart data is discarded when the selected period is empty

**File:** [use-summary.ts:206](src/hooks/use-summary.ts#L206)

```ts
if (curr.txnCount === 0) return { ...EMPTY, openingBalance: curr.openBal, closingBalance: curr.openBal }
```

`months` is a rolling last-12-months series that does not depend on the selected period, but
the early return replaces it with `[]`. Currently masked — the page hides the chart behind
`hasData` anyway — so this is latent rather than visible.

**Suggested fix:** compute `months` before the early return and include it in the empty payload.

<!-- USER_COMMENT: do it -->

---

### ⏸️ L-2 (kept as-is, your call) — "They owe you" is shown next to a negative number

**Files:** [people/page.tsx:91](src/app/app/people/page.tsx#L91), [people/[id]/page.tsx:124](src/app/app/people/[id]/page.tsx#L124)

The raw signed balance is printed, so a person who owes you 500 renders as **"-৳500 /
They owe you"**. The sign and the label say the same thing twice, and the minus reads as
though something is wrong. The share page already handles this correctly with `Math.abs`.

**Suggested fix:** print `formatCurrency(Math.abs(person.balance), …)` and let the label and
colour carry direction, matching the share page.

<!-- USER_COMMENT:  keep it as it is->

---

### ❔ L-3 (no decision given) — "Avg. txn" silently excludes three of the five transaction types

**File:** [use-summary.ts:224](src/hooks/use-summary.ts#L224)

`avgTransaction` averages income and expense only, while the tile immediately to its left
counts **all five** types. Two adjacent tiles use two different denominators under
similar-looking labels.

**Suggested fix:** relabel to "Avg. income/expense", or show the count it is based on.

<!-- USER_COMMENT:  -->

---

### ⏸️ L-4 (kept as-is, your call) — Share page balance drifts with live FX rates

**Files:** [share/[token]/page.tsx:45-48](src/app/share/[token]/page.tsx#L45-L48), [collections.ts:96-106](src/lib/appwrite/collections.ts#L96-L106)

The share document stores only a display currency; amounts are converted with whatever
rates the *viewer's* browser has. A shared multi-currency debt therefore shows a different
figure to different people at different times — for a number two people are meant to agree
on, that is a bad property.

Single-currency debts are unaffected (`convertCurrency` short-circuits on `from === to`).

**Suggested fix:** freeze the rates into the share document at generation time and convert
against those, so both parties always see the same number.

<!-- USER_COMMENT:  keep it as it is->

---

### ❔ L-5 (no decision given) — Exchange `amount` is stored as an unsigned absolute difference

**File:** [transaction-form.tsx:153](src/components/transactions/transaction-form.tsx#L153)

```ts
amount: isExchange ? Math.abs(Number(toAmount) - Number(fromAmount)) : Number(amount)
```

A 5-unit fee and a 5-unit gain are stored identically. Nothing reads it today — every
consumer uses `fromAmount`/`toAmount` — so this is a trap for future code, not a live bug.

**Suggested fix:** drop the `Math.abs` and store the signed difference.

<!-- USER_COMMENT:  -->

---

### ✅ L-6 — 12-month chart recomputes every conversion 12 times

**File:** [use-summary.ts:228-246](src/hooks/use-summary.ts#L228-L246)

The month loop walks the full transaction array once per month, calling `convertCurrency`
each time — 12 × N conversions where N would do. Negligible at 222 rows; noticeable at
several thousand.

**Suggested fix:** bucket transactions by month key in a single pass.

<!-- USER_COMMENT: do it -->

---

## ✅ Verified Correct

Checked and confirmed sound — no action needed:

- **`signedCashDelta` is genuinely the single source of truth.** All three call sites
  (`use-account-balances`, `use-people`, `use-summary`) use it; no drifting copies. *(F1)*
- **Give/take are correctly excluded from income/expense.** They feed `peopleNet` and
  `personBreakdown` only, so category breakdowns and avg/largest-expense stay clean. *(F13)*
- **People page ↔ Summary sign convention agree.** `positive = you owe them` throughout,
  and colours are re-derived per screen so green always means "good for you". *(F3)*
- **Share page perspective mirror is correct.** `given − taken` with "Received"/"Sent" labels
  is the right flip for the recipient's view — not a copy of the owner's formula. *(F5)*
- **Period boundaries use local time,** matching how the form stores wall-clock dates.
  A transaction at 11:50pm on the last of the month lands in the right month. *(F6/F8)*
- **Exchange-rate provider is solid.** Single shared fetch, stale-while-revalidate, keeps the
  last good rates on a failed refresh instead of regressing to the seed, hourly refresh. *(F14)*
- **All four balance paths paginate** rather than truncating at one page. *(F2)*
- **"All time" per-day average** uses the earliest transaction, not the Unix epoch. *(F9)*
- **`convertCurrency`'s formula** — `(amount × fromRate) / toRate` against BDT-relative
  rates — is correct, as is the provider's `1 / apiRate` inversion.
- **Opening-balance accumulation** correctly uses cash direction and is unaffected by the
  give/take P&L exclusion.
- **`formatSignedAmount`** handles all five types with the right signs. *(F12)*
- **Transaction counts** include all five types consistently.

---

## Suggested Order of Work

1. **C-1** — invents money on live data; fix first, and it repairs the existing bad row on read
2. **H-6** — same class of bug (missing conversion), and H-5 depends on it
3. **H-5** — closes the path that would recreate C-1
4. **H-1, H-2** — every trend badge is computed against the wrong window
5. **H-3, H-4** — badge colours actively mislead
6. **M-1, M-2, M-3** — silent-corruption hazards, cheap to fix
7. **M-5** — a product decision (rename to Transfer, or enable real cross-currency)
8. Everything else as time allows

---

## Notes on Method

- **Nothing was written to your database.** The reconciliation script issued only
  `listDocuments` calls; it was run from the project root and deleted immediately after.
- Every numeric claim in this report was produced by executing the app's own formulas,
  not by reading them.
- The reconciliation covered all 11 users, 64 accounts, 222 transactions, 7 people.

---

## Resolution Log — 2026-09-05

Applied per the `USER_COMMENT` decisions above. `npx tsc --noEmit` clean,
`npm run build` succeeds, `npm run lint` unchanged from before (same 1 pre-existing
error + 5 pre-existing warnings, none introduced here).

### Fixed (14)

| # | Change | Files |
|---|---|---|
| C-1 | New `exchangeNet()` converts each exchange leg in its own account's currency before subtracting | `calculations.ts`, `use-summary.ts` |
| H-1 | `previousOffset` (ms) replaced with explicit `previousStart`/`previousEnd` calendar bounds | `summary/page.tsx`, `use-summary.ts` |
| H-2 | Year comparison uses `new Date(year-1, 0, 1)`, immune to leap years | `summary/page.tsx` |
| H-3 | Badge colour now follows "is this good for the user", not the sign; expense inverted | `summary/page.tsx` |
| H-4 | Savings trend divides by `Math.abs(prev.savings)`; signed `±Infinity` for a zero baseline | `use-summary.ts` |
| H-5 | Currency field locks once an account has transactions, with the reason shown | `account-form.tsx`, `accounts/page.tsx`, `select.tsx` |
| H-6 | Each transaction is converted into its account's currency before being added to the balance | `use-account-balances.ts` |
| M-1 | Delete guard counts `fromAccountId`/`toAccountId` too, with a fallback if unindexed | `collections.ts`, `setup-db.mjs` |
| M-2 | `Query.orderDesc('$id')` tiebreaker makes paging deterministic | `collections.ts`, `api/share/[token]/route.ts` |
| M-3 | All four pagination loops break on an empty page | `use-account-balances.ts`, `use-people.ts`, `use-summary.ts` |
| M-4 | Unknown currency codes warn once in dev instead of silently passing through | `currencies.ts` |
| M-6 | Chart bars sit side by side, so a month can no longer exceed the plot height | `summary/page.tsx` |
| L-1 | 12-month chart is built before the empty-period early return | `use-summary.ts` |
| L-6 | Months bucketed in one pass instead of 12 full scans | `use-summary.ts` |

### Kept as-is (4, your decision)

- **M-5** — same-currency exchange restriction stays; "Exchange" remains a transfer.
  Note C-1's fix means cross-currency now computes correctly if you ever lift it.
- **M-7** — Appwrite's 5,000-offset ceiling, pending the Supabase move.
- **L-2** — People page keeps the signed balance.
- **L-4** — share page keeps converting at live rates.

### Still open (2)

**L-3** and **L-5** had empty comment slots, so they were left untouched. Both are
cosmetic/latent — say the word and they are a few minutes each.

### Verification

Re-ran the read-only reconciliation against live Appwrite data with the fixed formulas:

```
  6a6e5bbb00  txns=191  home=     8362.36  summary=     8362.36  drift=0.00  RECONCILES
  6a70dcd700  txns= 10  home=   233964.50  summary=   233964.50  drift=0.00  RECONCILES   <- was -27,384.00
  6a78ab0400  txns=  7  home=    16865.50  summary=    16865.50  drift=0.00  RECONCILES
  … 8 more users …

  ALL 11 USERS RECONCILE

  The previously-broken row: 2 USD -> 224 BDT
    old formula : +27,361.50 BDT   (invented)
    new formula :     -22.50 BDT   (correct)
```

Also verified by execution: all 12 month windows and all year windows (including leap
years) now land on the right boundaries, and all 10 badge-tone cases resolve correctly.

**The bad row was repaired on read — nothing in the database was modified.**

### One action left for you

`scripts/setup-db.mjs` gained two indexes so M-1's query is efficient. The script is
additive (`ensureIndex` only creates what is missing, and never drops anything), so
re-running it is safe:

```
node scripts/setup-db.mjs
```

Until then M-1 falls back to the old count, which still works but misses exchange-only
accounts.
