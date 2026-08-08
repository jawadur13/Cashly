# Cashly — Calculation Logic Audit

> Read-only findings report. **No code was changed.** This documents how every
> money calculation in the app works (what / where / how / why) and lists the
> bugs and inconsistencies found in the calculation logic.
>
> Scope reviewed: all hooks in `src/hooks`, currency logic in
> `src/lib/currency`, the Appwrite data layer in `src/lib/appwrite`, and every
> page/component that displays or derives a monetary value.

---

## 1. Data model (the inputs to every calculation)

`src/lib/types.ts` defines the shapes. Note the app has grown well beyond the
original `Plan/` docs (which only mention `income`/`expense`).

- **`TransactionType`** = `income | expense | exchange | give | take`
- **`Account`** has its own `currency`.
- **`Transaction`** carries: `amount`, `currency`, `accountId`, and for
  exchanges `fromAccountId/toAccountId/fromAmount/toAmount`, and for people
  `personId`.

### Intended semantics (inferred from the UI + hooks)

| Type | Meaning | Effect on your money | Person relationship |
| --- | --- | --- | --- |
| `income` | money earned | account **+amount** | — |
| `expense` | money spent | account **−amount** | — |
| `give` | you lend money to a person | account **−amount** | they now **owe you** |
| `take` | you borrow money from a person | account **+amount** | you now **owe them** |
| `exchange` | transfer between two **same-currency** accounts (a fee/gain may make `toAmount ≠ fromAmount`) | from **−fromAmount**, to **+toAmount** | — |

The exchange type **requires both accounts to share the same currency**
(`transaction-form.tsx` L119, L127), so `fromAmount`/`toAmount` are always in one
currency and the difference is a gain/loss/fee.

---

## 2. Currency conversion (the shared primitive)

**`src/lib/currency/currencies.ts` L71-82** — `convertCurrency(amount, from, to, rates)`:

```
result = amount * rates[from] / rates[to]
```

- `rates` are **"BDT per 1 unit"** (e.g. `USD: 123.25`). Base currency = BDT.
- If `from === to` → returns amount unchanged.
- If either rate is missing → **returns the amount unconverted (silent no-op)**.

**`src/hooks/use-exchange-rates.ts`** fetches live rates from
`open.er-api.com/v6/latest/BDT`, inverts them (`merged[code] = 1 / rate`, L36-41)
to match the "BDT per unit" convention, caches for 1h in `localStorage`, and
falls back to the hardcoded `RATES_RELATIVE_TO_BDT` seed.

**Formatting** (`src/lib/currency/format.ts`): `Intl.NumberFormat` per currency
locale; `formatSignedAmount` only understands `income | expense | exchange`.

---

## 3. Where each number is calculated & shown

| Screen / value | Source hook | File |
| --- | --- | --- |
| Home "Current balance" (all accounts, in default currency) | `useAccountBalances().total` | `src/hooks/use-account-balances.ts` |
| Home / Accounts per-account balance | `useAccountBalances().balances` | same |
| Accounts page ≈ equivalent line | `convertCurrency` in card | `src/components/accounts/account-card.tsx` |
| People list & person balance / status | `usePeople()` | `src/hooks/use-people.ts` |
| Person detail balance | `usePeople()` (reused) | `src/app/app/people/[id]/page.tsx` |
| Public share balance | inline `reduce` | `src/app/share/[token]/page.tsx` |
| Summary page (income/expense/savings/trends/opening-closing/per-category/per-person/12-mo chart) | `useSummary(range)` | `src/hooks/use-summary.ts` |
| Transaction row amount / exchange gain-loss | inline | `src/components/transactions/transaction-row.tsx` |
| "This month" tiles | `useMonthlySummary()` | `src/hooks/use-monthly-summary.ts` **(unused — see F10)** |

There are effectively **three independent engines** that each recompute money
from raw transactions: `useAccountBalances`, `usePeople`, and `useSummary`
(plus the dead `useMonthlySummary`). Because they were written separately, their
sign conventions and currency handling drift apart — that is the root cause of
most findings below.

---

## 4. Findings — bugs & inconsistencies

Severity: 🔴 high (wrong money shown) · 🟠 medium (wrong in edge cases / misleading) · 🟡 low (cosmetic / conceptual).

### 🔴 F1 — `take` is subtracted from the account balance (wrong sign)

**File:** `src/hooks/use-account-balances.ts` L31-33

```
} else {
  map[t.accountId] = (map[t.accountId] ?? 0) + (t.type === 'income' ? t.amount : -t.amount)
}
```

`give` and `take` both fall into this `else`. Only `income` adds; everything
else subtracts. So **`take` (borrowing money in) decreases the account balance**
instead of increasing it.

Every other engine treats `take` as an inflow:
- `use-summary.ts` L179 / L193: `take` → `inc += value` (positive).
- `use-monthly-summary.ts` L44: `take` → `income +=`.
- `transaction-row.tsx` L112-113: `take` rendered as green `+amount`.

**Impact:** the Home "Current balance", the per-account balances, and the
Accounts page are all wrong for any user who has `take` transactions. A borrowed
amount is shown as if it left the account. Expected: `income` **or** `take` → `+amount`.

---

### 🔴 F2 — Account balance is capped at 500 transactions

**File:** `src/hooks/use-account-balances.ts` L25

```
const res = await listTransactions({ userId: user.$id, limit: 500 })
```

Unlike `useSummary` (L142-150), `usePeople` (L25-39), and the person detail page
(L77-82), which all **paginate** through every transaction, this hook fetches
only the first 500 (newest by date). A user with >500 transactions gets a
**silently incorrect Home/Accounts balance** that omits the oldest records.

---

### 🔴 F3 — Person net sign is inverted between the People page and the Summary page

Same underlying event produces **opposite signs** in the two places:

- `use-people.ts` L44-45: `give → +amount`, `take → −amount`, so
  `balance = Σgiven − Σtaken`. Positive ⇒ status `they-owe` ⇒ green "They owe you"
  (`people/[id]/page.tsx` L120-134, `people/page.tsx` L85-92).
- `use-summary.ts` L104: `amount = taken − given` (the **negation**). The Summary
  page then treats positive as green/income ("People net", `summary/page.tsx`
  L97, L172, and per-person rows L188-190).

**Example:** you lend a friend 1000 (`give`).
- People page → **+1000, green, "Owes you"**.
- Summary "People net" → **−1000, red**.

The same loan is an asset on one screen and a red negative on the other. At
minimum the two screens must agree on a sign convention.

---

### 🔴 F4 — People / share balances ignore currency (mixed-currency sum)

**Files:** `src/hooks/use-people.ts` L42-46; `src/app/share/[token]/page.tsx` L57-61

```
if (t.type === 'give') map[t.personId] = (map[t.personId] ?? 0) + t.amount
if (t.type === 'take') map[t.personId] = (map[t.personId] ?? 0) - t.amount
```

`t.amount` is added **raw**, with no `convertCurrency` call. If you lend a friend
`$100` (USD) and `৳500` (BDT), the balance becomes `600` in no currency at all,
but it is then **displayed with the default-currency symbol** (`people/page.tsx`
L91, `people/[id]/page.tsx` L124 use `formatCurrency(person.balance, defaultCurrency)`).

The share page (L74) hardcodes the symbol to `'BDT'` regardless of the actual
transaction currencies. This is the one place currency conversion is genuinely
missing (contrast with `useSummary`/`useAccountBalances` which do convert).

---

### 🔴 F5 — Share page inverts owe/owed wording vs. the rest of the app

**File:** `src/app/share/[token]/page.tsx` L57-82, L95-100

The share page recomputes `balance = Σgive − Σtake` (L57-61), same formula as
`usePeople`. But then:

- **Color/label** (L68-83): `balance > 0` → **red "You owe"**; `balance < 0` →
  green "You are owed". This is the **opposite** of the owner's People page,
  where `balance > 0` = green "They owe you" (`people/page.tsx` L85-92).
- **Row label** (L95-100): `isGive = t.type === 'give'` is labelled
  **"Received"** with a green income tone; `take` is labelled **"Sent"** in red.

So a `give` (you lent money out) is shown to the recipient as "Received" — which
is arguably correct *from the friend's perspective*, but the top-card summary
("You owe") then contradicts those very rows. The perspective flip is applied to
the labels but not consistently to the headline balance, so the shared page is
internally inconsistent and disagrees with the owner's screen.

---

### 🟠 F6 — Monthly cash-flow chart drops `give`/`take`, unlike the tiles above it

**File:** `src/hooks/use-summary.ts` L227-234 (the 12-month loop)

```
if (t.type === 'income' || t.type === 'take') mInc += val
else if (t.type === 'expense' || t.type === 'give') mExp += val
else if (t.type === 'exchange') { mInc += 0 }
```

This block **does** include `give`/`take` — good. **However**, the same-file
period aggregation (L190-194) folds `give` into `exp` and `take` into `inc`, so
the top "Income/Expense" tiles and the chart *mostly* agree. The subtle mismatch
is the **date window**: the tiles use `new Date(t.date).getTime()` compared with
`Date.UTC(...)` period bounds (L177, L181, L188), while the chart uses local
`new Date(now.getFullYear(), now.getMonth() - i, 1)` for `mStart` but `Date.UTC`
for the transaction test (L223-229). Mixing **local-time month starts** with
**UTC timestamps** shifts boundary transactions into the wrong month for users
far from UTC (the app's timezone is Asia/Dhaka, UTC+6). See F8 for the general
timezone problem.

---

### 🟠 F7 — Exchange "gain/loss" is double-counted and mislabeled as "Exchange"

**Files:** `use-summary.ts` L194, L246; `use-monthly-summary.ts` L47-50;
`summary/page.tsx` L286; `monthly-summary.tsx` L45

The Summary/Monthly "Exchange" tile shows
`exch += |fromAmount − toAmount|` — the absolute **fee/gain** of each exchange.
Two problems:

1. **Label vs. meaning:** it is presented as a peer of Income/Expense/Savings,
   implying a cash-flow bucket, but it is actually the *net leakage* of a
   same-currency transfer. A user reading "Exchange: ৳50" cannot tell if that
   was a gain or a loss because `Math.abs` throws the sign away.
2. **Not reflected in Savings, but reflected in Closing balance:** `savings =
   inc − exp` (L198) ignores exchange entirely, yet `closingBalance =
   openBal + savings + exchNet` (L246) adds `exchNet` (signed
   `toAmount − fromAmount`). So an exchange fee **silently changes the closing
   balance** without appearing in Income, Expense, or Savings — the card numbers
   don't reconcile (`opening + income − expense ≠ closing`).

---

### 🟠 F8 — Date filtering mixes UTC boundaries with local/stored timestamps

**Files:** `use-summary.ts` (L177, L223-229), `summary/page.tsx` (L64-77),
`use-monthly-summary.ts` (L31-32), `transaction-form.tsx` (L158)

- Transactions are saved with a **local** wall-clock time converted to ISO:
  `new Date(date + 'T' + time).toISOString()` (form L158).
- Summary period bounds are built with `Date.UTC(...)` (summary page L64-77).
- The monthly-summary "from" is `Date.UTC(year, month, 1)` (hook L31-32).

For a UTC+6 user, a transaction entered at `2025-03-01 02:00` local is stored as
`2025-02-28T20:00Z`. A "March" filter built on `Date.UTC(y, 2, 1)` will **exclude
it from March** (and the opening-balance branch will fold it into the prior
period). Month/҂year totals can therefore misattribute transactions near
midnight at the start/end of a period.

---

### 🟠 F9 — `daysInPeriod` makes "≈ per day" wrong for past & future periods

**File:** `src/hooks/use-summary.ts` L112-116, used at L216-217

```
function daysInPeriod(start, end) {
  const s = Math.max(start, 0)
  const e = Math.min(end, Date.now())
  return Math.max(1, Math.ceil((e - s) / DAY))
}
```

- For **"All time"**, `start = -Infinity` → clamped to `0` (the Unix epoch,
  1970). `dailyAverage = expense / (~55 years in days)`, i.e. essentially **0**.
- For a **past month**, `end` is clamped to `Date.now()`, so a fully-elapsed
  month still divides by the days up to *today* only when the month is the
  current one; a past month divides by its real length (fine), but a **future**
  month selected in the picker yields `e < s` → clamped to `1` day, so
  "≈ per day" equals the whole month's expense. The clamp logic doesn't match
  the selected period.

---

### 🟠 F10 — `useMonthlySummary` + `MonthlySummary` are dead but divergent code

**Files:** `src/hooks/use-monthly-summary.ts`, `src/components/home/monthly-summary.tsx`

Neither is imported anywhere (`monthly-summary` has zero `.tsx` references; the
hook is never called). It's dead code — but it also has `limit: 500` with no
pagination (same class of bug as F2) and its own copy of the exchange/give/take
rules. If it's ever wired back in, it will reintroduce inconsistencies. Worth
either deleting or fixing so it can't silently rot.

---

### 🟡 F11 — Trends only appear when the previous period had income

**File:** `src/hooks/use-summary.ts` L209-214

```
if (prev.inc > 0) incomeTrend = ...
if (prev.exp > 0) expenseTrend = ...
if (prev.inc > 0) savingsTrend = prev.savings > 0 ? ... : null
```

`savingsTrend` is gated on `prev.inc > 0` (should logically be about savings),
and every trend is `null` when the base is `0`, so going from `0 → something`
never shows growth (a legitimate "new activity" signal is hidden). Also
`Math.abs(trend).toFixed(0)` in the badge (`summary/page.tsx` L240) hides the
direction sign for anything that rounds oddly and shows `0%` for tiny changes.

---

### 🟡 F12 — `formatSignedAmount` has no case for `give`/`take`

**File:** `src/lib/currency/format.ts` L17-26

The signature only accepts `'income' | 'expense' | 'exchange'`. Callers work
around it by passing `'income'`/`'expense'` for give/take
(`transaction-row.tsx` L113, `share/[token]` L113). Functional, but the helper's
type no longer models the domain, which is how sign bugs like F1/F3 creep in.

---

### 🟡 F13 — `largestExpense`, `avgIncome`, `avgExpense` computed but never shown

**File:** `src/hooks/use-summary.ts` L250-254

These three are calculated on every render but not rendered anywhere in
`summary/page.tsx`. Harmless, but they inflate the compute and, more importantly,
`largestExpense`/`avgExpense` include `give` amounts (since `give` folds into
`exp`), so if surfaced later they'd be misleading.

---

## 5. Cross-cutting root cause

Every finding traces back to **three separately-authored aggregation engines**
that disagree on two axes:

1. **Sign of `give`/`take`** — `useAccountBalances` (F1), `usePeople` vs
   `useSummary` (F3), and the share page (F5) each pick a different convention.
2. **Currency normalization** — `useSummary`/`useAccountBalances` convert to the
   default currency; `usePeople` and the share page **don't** (F4).

A single shared helper — e.g. `signedAccountDelta(t)` and
`signedPersonDelta(t)` plus a mandatory `convertCurrency` at the point of
summation — would make all screens agree and remove F1, F3, F4, F5, and most of
F6/F7 by construction.

---

## 6. Quick reference — severity table

| ID | Severity | One-line summary | Primary file |
| --- | --- | --- | --- |
| F1 | 🔴 | `take` wrongly subtracts from account balance | `use-account-balances.ts` L32 |
| F2 | 🔴 | Account balance capped at 500 txns (no pagination) | `use-account-balances.ts` L25 |
| F3 | 🔴 | Person net sign inverted: People vs Summary | `use-people.ts` L44 / `use-summary.ts` L104 |
| F4 | 🔴 | People & share balances sum mixed currencies (no convert) | `use-people.ts` L42-46 / `share/[token]` L57 |
| F5 | 🔴 | Share page owe/owed wording contradicts owner + itself | `share/[token]/page.tsx` L57-100 |
| F6 | 🟠 | 12-mo chart month boundaries use mixed UTC/local time | `use-summary.ts` L223-229 |
| F7 | 🟠 | Exchange fee double-counted; breaks opening+savings=closing | `use-summary.ts` L194,246 |
| F8 | 🟠 | UTC period bounds vs local stored timestamps | `use-summary.ts` / `summary/page.tsx` |
| F9 | 🟠 | `daysInPeriod` wrong for all-time & non-current periods | `use-summary.ts` L112-116 |
| F10 | 🟠 | Dead `useMonthlySummary` still carries F2-class bugs | `use-monthly-summary.ts` |
| F11 | 🟡 | Trends hidden when base period is zero | `use-summary.ts` L209-214 |
| F12 | 🟡 | `formatSignedAmount` type omits give/take | `format.ts` L17-26 |
| F13 | 🟡 | `largestExpense`/avg fields computed, unused, include give | `use-summary.ts` L250-254 |

*End of report — no source files were modified.*
