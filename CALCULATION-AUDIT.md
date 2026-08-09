# Cashly — Calculation Logic Audit

> Read-only findings report. **No code has been changed.** This explains, in
> plain language, how every money calculation in the app works, what's wrong
> with some of them, why it happens, and what the fix options are.
>
> Scope reviewed: all hooks in `src/hooks`, currency logic in
> `src/lib/currency`, the Appwrite data layer in `src/lib/appwrite`, and every
> page/component that displays or derives a monetary value.
>
> **How to use this doc:** each finding below has a plain-language
> explanation, the cause, the impact, a suggested fix, and — where there's a
> real product decision to make — options for you to pick from. Leave
> `<!-- USER_COMMENT: ... -->` comments anywhere and I'll fold them in on the
> next pass. Nothing gets fixed until you say go.

---

## 1. How the app models money

`src/lib/types.ts` defines the shapes everything else is built on.

- A transaction is one of five **types**: `income`, `expense`, `exchange`,
  `give`, `take`.
- Every **account** has its own currency (e.g. a BDT cash wallet, a USD bank
  account).
- A transaction carries `amount` + `currency`, and — only for exchanges —
  `fromAccountId` / `toAccountId` / `fromAmount` / `toAmount`, and — only for
  give/take — a `personId`.

The app has grown well past the original `Plan/` docs, which only describe
`income`/`expense` on a single currency with no accounts, no people, and no
sharing. **That expansion is treated as the real, confirmed scope of the app
going forward** — exchange, give/take, multiple accounts, multi-currency, and
person-to-person sharing are must-have features, not scope creep to be
second-guessed. The `Plan/` docs are just stale and should eventually be
updated to match reality; that's a documentation follow-up, not something
this audit is questioning.

### What each transaction type is supposed to do

| Type | Meaning | Effect on your account | Effect on the person relationship |
| --- | --- | --- | --- |
| `income` | money earned | account **+amount** | — |
| `expense` | money spent | account **−amount** | — |
| `give` | you lend money to a person | account **−amount** | they now **owe you** |
| `take` | you borrow money from a person | account **+amount** | you now **owe them** |
| `exchange` | transfer between two **same-currency** accounts (a fee/gain may make `toAmount ≠ fromAmount`) | from account **−fromAmount**, to account **+toAmount** | — |
<!-- USER_COMMENT:correct ... -->
This table is confirmed correct — it matches the UI and every hook's intent.
The bugs below are all places where the *code* drifts from this table, not
places where the table itself is wrong.

The exchange type **requires both accounts to share the same currency**
(`transaction-form.tsx` L119, L127), so `fromAmount`/`toAmount` are always in
one currency, and the difference between them is a same-currency gain/loss or
fee (e.g. a transfer fee eating a few taka).

---

## 2. How currency conversion works

**`src/lib/currency/currencies.ts` L71-82** — `convertCurrency(amount, from, to, rates)`:

```
result = amount * rates[from] / rates[to]
```

- Exchange rates are stored as **"BDT per 1 unit"** (e.g. `USD: 123.25` means
  1 USD = 123.25 BDT). BDT is the anchor currency for all math.
- Same currency in and out → returned unchanged.
- If a rate is missing for either currency → the function **quietly returns
  the amount unconverted**. No error, no warning — the number is just wrong
  by whatever the real exchange rate would have been.

**`src/hooks/use-exchange-rates.ts`** fetches live rates once an hour from
`open.er-api.com/v6/latest/BDT`, flips them (the API gives "units per BDT",
this app wants "BDT per unit", so it inverts with `1 / rate`), caches the
result in the browser's `localStorage`, and falls back to a hardcoded rate
table if the fetch fails.
<!-- USER_COMMENT:do whatever need to be done to fix this real time exchaange rate , it must show real time value... . -->
**Formatting** (`src/lib/currency/format.ts`) uses the browser's built-in
`Intl.NumberFormat` per currency. One relevant gap: the helper that adds a
`+`/`−` sign to an amount (`formatSignedAmount`) only knows about
`income | expense | exchange` — see F12.

---

## 3. Where each number on screen actually comes from

| Screen / value | Computed by | File |
| --- | --- | --- |
| Home "Current balance" (all accounts, converted to your default currency) | `useAccountBalances().total` | `src/hooks/use-account-balances.ts` |
| Home / Accounts per-account balance | `useAccountBalances().balances` | same |
| Accounts page "≈ equivalent" line | `convertCurrency` inline in the card | `src/components/accounts/account-card.tsx` |
| People list & person balance / status | `usePeople()` | `src/hooks/use-people.ts` |
| Person detail page balance | `usePeople()` (reused) | `src/app/app/people/[id]/page.tsx` |
| Public share-link balance | inline `reduce` | `src/app/share/[token]/page.tsx` |
| Summary page (income/expense/savings/trends/opening-closing/per-category/per-person/12-month chart) | `useSummary(range)` | `src/hooks/use-summary.ts` |
| Transaction row amount / exchange gain-loss | inline in the row component | `src/components/transactions/transaction-row.tsx` |
| "This month" tiles | `useMonthlySummary()` | `src/hooks/use-monthly-summary.ts` — **dead code, see F10** |

**The core problem, in one sentence:** there are three separate places
(`useAccountBalances`, `usePeople`, `useSummary`) that each independently
re-derive money from the same raw transactions, and because they were built
at different times, they don't agree with each other on two things — which
direction `give`/`take` moves the number, and whether to convert currency
before adding amounts together. Almost every finding below is a symptom of
that.

---

## 4. Findings

Severity key: 🔴 **wrong money shown to the user** · 🟠 **wrong in edge
cases, or numbers that don't add up** · 🟡 **cosmetic / dead code / no wrong
number today**.

Each finding follows the same shape: what you'd actually see → why the code
does that → who/what it affects → the suggested fix → any real decision that
needs your input before touching code.

---

### F1 — 🔴 Borrowing money makes your balance go *down*

**What you'd see:** you record a "Take" (borrowing ৳5,000 from a friend), and
your account balance on Home drops by ৳5,000 instead of rising by it — even
though the cash physically landed in your account.
<!-- USER_COMMENT:fix this ... -->
**Where:** `src/hooks/use-account-balances.ts`, line 32

```js
map[t.accountId] = (map[t.accountId] ?? 0) + (t.type === 'income' ? t.amount : -t.amount)
```

**Root cause:** this line only special-cases `income` as "add"; every other
type — `expense`, `give`, *and* `take` — falls into the same "subtract"
bucket. `take` never got its own rule.

**Impact:** every screen fed by this hook — Home "Current balance",
per-account balances, and the Accounts page — is wrong for anyone who has
ever used Take. Everywhere else in the app already agrees `take` is money
coming in: the Summary page counts it as income, and the transaction row
shows it in green with a `+`. This hook is the odd one out.

**Suggested fix:** `income` **or** `take` → `+amount`; `expense` **or**
`give` → `−amount`.

**Decision needed:** none — this is a straightforward bug, not a design
choice. Flag if you disagree.
<!-- USER_COMMENT:no disagree from me, fix it ... -->
---

### F2 — 🔴 Balance silently ignores everything past your first 500 transactions

**What you'd see:** if you've logged more than 500 transactions, your Home
balance is missing whatever fell off the end — with no warning that it's
incomplete.

**Where:** `src/hooks/use-account-balances.ts`, line 25

```js
const res = await listTransactions({ userId: user.$id, limit: 500 })
```

**Root cause:** this hook fetches one page of 500 transactions (newest
first) and stops. `useSummary`, `usePeople`, and the person-detail page all
correctly loop through *every* page until they've read everything — this
hook is the only one that doesn't.

**Impact:** grows worse over time. A brand-new user never notices; a
long-time user's balance quietly becomes wrong the day they cross transaction
#500, and gets more wrong every transaction after that.

**Suggested fix:** paginate like the other three hooks already do.

**Options — this one does have a real trade-off:**
1. **Full client-side recompute** (matches the existing pattern in
   `useSummary`/`usePeople`) — simplest, consistent with the rest of the
   code, but means Home has to download *every* transaction on every load.
   Fine for hundreds/low-thousands of transactions; starts to feel slow well
   beyond that.
2. **A maintained running balance** — e.g. store a `balance` field on each
   account and adjust it by ± the amount whenever a transaction is
   created/edited/deleted, instead of recomputing from scratch. Cheap to
   read, but it's a bigger change (needs to happen in every code path that
   writes a transaction, and needs a one-time backfill for existing data).

I'd default to option 1 unless you expect users with thousands of
transactions soon — happy to build either. <!-- USER_COMMENT:go with option a ... -->

---

### F3 — 🔴 The same loan shows as a gain on one screen and a loss on another

**What you'd see:** you lend a friend ৳1,000 (`give`). The People page shows
**+৳1,000 in green, "Owes you."** The Summary page's "People net" shows
**−৳1,000 in red.** Same event, opposite story, depending which screen you
look at.

**Where:** `src/hooks/use-people.ts` L44-45 vs. `src/hooks/use-summary.ts` L104

- People page's math: `balance = Σ(given) − Σ(taken)`. Positive = they owe
  you = shown green.
- Summary page's math: `amount = Σ(taken) − Σ(given)` — the exact opposite
  formula. Positive there gets colored green/income too, so the *meaning* of
  "positive" flips between the two screens.

**Root cause:** the two hooks were written independently and picked opposite
sign conventions for the same underlying data.

**Impact:** anyone who checks both the People page and the Summary page for
the same friend will see contradictory numbers. This is confusing in a way
that erodes trust in the whole app's numbers, not just this one figure.

**Suggested fix:** make both screens use the same formula.

**Decision needed:** which direction is "positive"? My recommendation is the
People page's convention — `balance = given − taken`, positive = **they owe
you** (an asset to you, hence green) — because it's the one a user reads
first and it matches "green = good for me." That means the Summary page's
"People net" tile and per-person breakdown would flip to match. Confirm
you're good with that, or tell me if you'd rather standardize on the other
direction instead.
<!-- USER_COMMENT:it should be opposite right? as the person i link share with will see in his/her perspective ... -->
---

### F4 — 🔴 Lending in different currencies gets added together as if they were the same money

**What you'd see:** you lend a friend $100 USD and also ৳500 BDT. The app
adds `100 + 500 = 600` and displays it as `৳600` — which is neither a correct
USD amount nor a correct BDT amount, just two unrelated numbers mashed
together.

**Where:** `src/hooks/use-people.ts` L42-46 and
`src/app/share/[token]/page.tsx` L57-61

```js
if (t.type === 'give') map[t.personId] = (map[t.personId] ?? 0) + t.amount
if (t.type === 'take') map[t.personId] = (map[t.personId] ?? 0) - t.amount
```

**Root cause:** `t.amount` is summed raw, with no call to `convertCurrency`.
This is the *only* place in the whole calculation layer that skips currency
conversion — `useSummary` and `useAccountBalances` both convert correctly
before summing.

**Impact:** anyone who lends/borrows in more than one currency with the same
person gets a meaningless total. On top of that, the public share page
(L74) hardcodes the **`'BDT'`** symbol on the total regardless of what
currencies were actually involved, so even a *correct* number would still
display with the wrong currency symbol for a non-BDT user.

**Suggested fix:** convert every `give`/`take` amount to a common currency
(same pattern as `useSummary`) before summing.

**Decision needed:**
1. Confirm: convert everything to the **owner's default currency** at
   summation time — same as the rest of the app already does. (I'd assume
   yes, but flagging since it's the one place currently different.) <!-- USER_COMMENT:yes , convert to owner's currency ... -->
2. The share page has no owner "session" to read a default currency from
   (the person opening the link isn't logged in). Should the share link
   **bake in** the owner's default currency at the moment the link is
   generated (stored alongside the transaction snapshot), so the recipient's
   page always shows the right symbol? <!-- USER_COMMENT:yes , bake in owner's currency ... -->

---

### F5 — 🟡 *(downgraded from 🔴 after re-check — see note)* Share page's "You owe" wording feels contradictory, even though the math is right

**What you'd see:** the friend opens their share link. If they owe you
money, the page correctly says **"You owe"** in red. But scrolling down, the
individual transactions that created that debt are shown as **"Received"**
in green — so the page tells them "good news, you received money" right
above a red "you owe" total, which reads as mixed signals even though both
lines are technically correct.

**Where:** `src/app/share/[token]/page.tsx` L57-100

**Root cause / correction from the original pass:** I initially flagged the
headline ("You owe" vs. the owner's People page saying "They owe you") as a
sign bug. On closer check, **it isn't** — it's a correctly mirrored
perspective. The exact same balance is an asset to you (green, "they owe
you") and a liability to your friend (red, "you owe") — that flip is
supposed to happen, the same way a bank statement shows the same transfer as
a debit on one account and a credit on the other. So this is **not** a math
error.

What *is* a legitimate (much smaller) issue: the per-row coloring treats
`give` → "Received" in a positive/green tone, purely based on cash direction,
with no visual link to the fact that receiving money here means *owing* it
back. It's not wrong, just a little jarring.

**Impact:** none on correctness. Possible minor confusion for the person
receiving the share link.

**Options:**
1. **Leave it as-is** — it's an accurate "cash flow in/out" ledger, which is
   a defensible, common pattern (like a bank statement).
2. **Soften the per-row color** (e.g. neutral gray instead of green/red for
   "Received"/"Sent") so the rows don't visually fight the headline.
3. **Add a one-line explainer** near the headline (e.g. "based on money
   given and taken between you") so the relationship between rows and total
   is explicit.

No strong recommendation from me here — this is a taste call, not a
correctness one.<!-- USER_COMMENT:it is fine as it is ... -->

---

### F6 — 🟠 The 12-month chart and the tiles above it can disagree near month boundaries

**What you'd see:** a transaction made late at night near the end of a month
shows up in the wrong month's bar on the "Cash flow — last 12 months" chart,
compared to where the Summary tiles above it put it.

**Where:** `src/hooks/use-summary.ts` L227-234 (the chart loop) vs. L190-194
(the tiles)

**Root cause:** both blocks correctly fold `give`/`take` into
expense/income, so that's not the issue — the issue is *how each one decides
which month a transaction belongs to*. The chart builds its month boundary
using the browser's **local** time (`new Date(now.getFullYear(), ...)`) but
then compares it against a **UTC** timestamp. The tiles use a UTC boundary
built a different way (see F8, this is really the same root problem showing
up twice).

**Impact:** only affects transactions near midnight around the 1st of a
month, for users outside UTC (the app's primary users are in Asia/Dhaka,
UTC+6). This is the general timezone problem from F8, just visible in a
second place.

**Suggested fix:** fixed once F8 is fixed — see that finding for the options,
since they share one root cause and one fix.

---

### F7 — 🟠 Exchange fees quietly change your closing balance without showing up anywhere else

**What you'd see:** you do a same-currency transfer between two accounts
that costs a small fee. The Summary page's Income/Expense/Savings tiles
don't move at all — but the Closing balance is lower than
`Opening + Savings` would suggest, with no visible line explaining the gap.

**Where:** `src/hooks/use-summary.ts` L194 & L246 (also duplicated in the
dead `use-monthly-summary.ts` L47-50)

**Root cause, two compounding issues:**
1. **The "Exchange" tile throws away the sign.** It shows
   `|fromAmount − toAmount|` — an absolute value — so "Exchange: ৳50" could
   mean you gained 50 or lost 50, and there's no way to tell which from the
   tile alone.
2. **It's excluded from Savings but included in Closing balance.**
   `savings = income − expense` never touches the exchange fee, but
   `closingBalance = opening + savings + exchangeFee` does. So the cards
   don't add up: `opening + income − expense ≠ closing`, and a user doing
   the arithmetic themselves will think something's missing (something *is*
   missing — it's just not shown).

**Impact:** anyone who does same-currency transfers with fees (or gets a
small gain) will see numbers that don't reconcile, with no explanation on
screen.

**Decision needed — two ways to fix this:**
1. **Fold the exchange fee into Savings.** `savings = income − expense ±
   exchangeFee`. Then Income/Expense/Savings/Closing all reconcile again,
   and "Exchange" becomes purely an informational tile.
2. **Keep Savings pure, stop hiding the fee in Closing balance.** Show the
   fee as its own explicit line (e.g. "Exchange fees: −৳50") between Savings
   and Closing, so the arithmetic is visible instead of silent.

Either fixes the "doesn't add up" problem; option 2 is more transparent,
option 1 is simpler to read at a glance. Also worth confirming: should the
"Exchange" tile show the **signed** net (so a gain shows green, a loss shows
red) instead of an unsigned absolute value?
<!-- USER_COMMENT:didnt understand what you said, also i am not clear, use suitable fix as you think will be best for the user i trust your judgement ... -->
---

### F8 — 🟠 Transactions are saved in local time but filtered in UTC

**What you'd see:** a transaction logged just after midnight can get counted
in the wrong month or year — filed under the previous period instead of the
one you actually meant.

**Where:** transaction saving (`transaction-form.tsx` L158) vs. period
filtering (`use-summary.ts` L177 & summary page L64-77, plus the dead
`use-monthly-summary.ts` L31-32)

**Root cause:** when you save a transaction, the date+time you typed is
treated as your **local** wall-clock time and converted to a UTC timestamp
for storage. But when the Summary page later asks "give me everything in
March," it builds the March boundary using `Date.UTC(...)` — i.e. UTC
midnight, not your local midnight. For a UTC+6 user (Bangladesh), that's a
6-hour gap: a transaction entered at `2025-03-01, 2:00 AM` local time is
stored as `2025-02-28, 8:00 PM UTC`, and a UTC-based "March" filter excludes
it — it gets counted in February instead.

**Impact:** only transactions within roughly a 6-hour window around
midnight, at the start/end of whatever period you're viewing — but for those
transactions, they land in the wrong month/year total, and the app gives no
indication anything's off.

**Decision needed:** which timezone should period boundaries use?
1. **The browser's local timezone** (recommended) — matches how the date was
   entered and how a user thinks about "March," and requires no
   configuration. Works correctly for any user regardless of where they are.
2. **A fixed Asia/Dhaka (UTC+6) assumption** — simpler code, but breaks the
   moment a user opens the app from a different timezone (travel, a second
   user abroad, etc.), and only "works" for BDT users by coincidence.

I'd go with option 1 unless there's a specific reason to hard-code the
timezone. <!-- USER_COMMENT: do option 1 ... -->

---

### F9 — 🟠 "≈ per day" is meaningless for "All time," and would break for a future period

**What you'd see:** switch the Summary page to "All time" — the "≈ per day"
tile shows a number so close to zero it's not useful.

**Where:** `src/hooks/use-summary.ts` L112-116

```js
function daysInPeriod(start, end) {
  const s = Math.max(start, 0)          // "All time" starts at -Infinity → clamped to 1970
  const e = Math.min(end, Date.now())
  return Math.max(1, Math.ceil((e - s) / DAY))
}
```

**Root cause:** "All time" is represented internally as starting at
`-Infinity`, which this function clamps to `0` — the Unix epoch, January
1970. So "≈ per day" for All Time divides your real spending by roughly 55
years worth of days, which rounds to essentially nothing.

There's a second latent issue in the same function (dividing by a clamped
`1` day if the period's start were ever in the future), but **I checked and
there's currently no way to select a future month or year in the UI** — the
month/year pickers only ever offer the current period and past ones. So
that half of the original finding is a latent risk for if a future/custom
date range is ever added, not something you can hit today.

**Impact:** live and visible today, specifically on "All time."

**Options:**
1. **Base the average on days since your first transaction**, not the Unix
   epoch — gives a genuinely meaningful "per day" figure for All Time.
2. **Hide the "≈ per day" tile entirely when scope = All Time** — simplest,
   avoids showing a number that's arguably not meaningful for an open-ended
   range anyway.

Either is reasonable; option 1 gives more information, option 2 is more
honest about the limits of the metric. Your call.<!-- USER_COMMENT: use your judgement to fix it ... -->

---

### F10 — 🟡 There's a second, unused copy of the Summary math that has the same bugs

**What you'd see:** nothing — this code isn't wired into any screen. It's
flagged so it doesn't quietly get turned back on with the same bugs still
inside it.

**Where:** `src/hooks/use-monthly-summary.ts` and
`src/components/home/monthly-summary.tsx`

**Root cause:** this looks like an earlier version of the "This month"
tiles, superseded by `useSummary`, but never deleted. It has its own copy of
the give/take/exchange rules (with the same class of 500-transaction cap as
F2) and isn't imported by any page or component — confirmed zero references.

**Decision needed:**
1. **Delete both files** — cleanest, since nothing uses them today.
2. **Keep it, but only if there's a concrete plan to bring back a "This
   month" tile on Home** — in which case it should be rebuilt on the shared
   calculation helper proposed in §6, not left as its own hand-rolled copy.
<!-- USER_COMMENT:dont keep any dead codes, remove it as there is no use of it . keep only the needed and in use code . for adding new feature i will write a proper prompt later ... -->
---

### F11 — 🟡 Trend arrows (↑12% vs last month) go missing more often than they should

**What you'd see:** compare this month to last month — sometimes no trend
arrow shows up at all, even when there's an obvious change (e.g. going from
"no income last month" to "some income this month" never shows as a trend).

**Where:** `src/hooks/use-summary.ts` L209-214

**Root cause:** each trend is only calculated `if (previous period's value >
0)`. So if the previous period had exactly zero of something, the trend is
hidden instead of showing "new activity" — arguably the most interesting
case to highlight, not the one to hide. There's also a small mislabeling:
the *savings* trend is gated on `prev.income > 0` rather than on
`prev.savings`, which isn't quite the right condition even on its own terms.

**Impact:** cosmetic — no wrong numbers, just a missing signal in cases where
users would probably want to see one (e.g. a first paycheck this month).

**Suggested fix:** show a trend whenever the previous period had *any*
transactions, and treat "zero → something" as a clear positive/new signal
rather than suppressing it. Confirm you want that behavior, or if hiding a
"0 → X" jump (as a % that's technically infinite) is intentional.
<!-- USER_COMMENT: make it as you think it would be best ... -->
---

### F12 — 🟡 The sign-formatting helper doesn't know about Give/Take

**Where:** `src/lib/currency/format.ts` L17-26

**Root cause:** `formatSignedAmount` only accepts `'income' | 'expense' |
'exchange'` as a type. Every caller that needs to format a give/take amount
works around it by passing `'income'`/`'expense'` instead of the real type.
It works today, but it means the type no longer describes what the function
actually handles — which is exactly the kind of gap that let bugs like F1/F3
creep in unnoticed.

**Suggested fix:** widen the type to include `'give' | 'take'` and handle
them explicitly, instead of relying on every caller to remember the
workaround.

**Decision needed:** none — pure cleanup, bundle with whatever else touches
this file.
<!-- USER_COMMENT: use your judgement ... -->
---

### F13 — 🟡 A few stats are calculated but never shown — and would be misleading if they were

**Where:** `src/hooks/use-summary.ts` L250-254

**Root cause:** `avgIncome`, `avgExpense`, and `largestExpense` are computed
on every render but never rendered anywhere on the Summary page today.
Harmless as dead computation, but worth flagging because `avgExpense` and
`largestExpense` both include `give` amounts (since `give` is folded into
"expense" internally) — so if someone adds a "Biggest expense" tile later
using this field as-is, it could show a large loan to a friend labeled as
your biggest *expense*, which isn't really the same thing.

**Decision needed:**
1. **Delete the dead computation** if there's no plan to show these.
2. **Surface them in the UI**, but first decide whether `largestExpense`
   should exclude `give` (so it's a true "biggest expense," separate from
   money lent to people).
<!-- USER_COMMENT: money lent and borrow shouldnt show under income or expense . this is a basic math error in logic, fix it ... -->
---

## 5. Why this keeps happening

Almost every finding above traces back to the same structural issue: three
separately-written pieces of code (`useAccountBalances`, `usePeople`,
`useSummary`) each re-derive money from the same raw transaction list, and
because nobody wrote one shared rule, they drifted apart on two questions:

1. **Which direction does `give`/`take` move the number?** — Answered
   differently by `useAccountBalances` (F1), `usePeople` vs. `useSummary`
   (F3).
2. **Do you convert currency before adding amounts together?** —
   `useSummary` and `useAccountBalances` do; `usePeople` and the share page
   don't (F4).

**The structural fix:** one small shared helper module — something like
`signedAccountDelta(transaction)` and `signedPersonDelta(transaction)`, plus
a single `toDefaultCurrency(amount, currency)` wrapper — used by all three
places instead of each hook re-implementing its own rules. That one change
removes F1, F3, and F4 by construction (they become impossible to get wrong
independently), and gives F10 a correct foundation to rebuild on if it's kept
alive.

---

## 6. Quick reference table

| ID | Severity | One-line summary | File |
| --- | --- | --- | --- |
| F1 | 🔴 | `take` wrongly subtracts from account balance | `use-account-balances.ts` L32 |
| F2 | 🔴 | Account balance ignores transactions past #500 (no pagination) | `use-account-balances.ts` L25 |
| F3 | 🔴 | Person balance sign is inverted between People page and Summary page | `use-people.ts` L44 / `use-summary.ts` L104 |
| F4 | 🔴 | People & share balances add different currencies together | `use-people.ts` L42-46 / `share/[token]` L57 |
| F5 | 🟡 *(was 🔴)* | Share page wording *looks* contradictory but math is correct — cosmetic only | `share/[token]/page.tsx` L57-100 |
| F6 | 🟠 | 12-month chart can misplace transactions near month boundaries | `use-summary.ts` L223-229 |
| F7 | 🟠 | Exchange fees change Closing balance without appearing in any other tile | `use-summary.ts` L194, L246 |
| F8 | 🟠 | Local-time entry vs. UTC filtering can misfile transactions near midnight | `use-summary.ts` / `summary/page.tsx` |
| F9 | 🟠 | "≈ per day" is ~0 for "All time" | `use-summary.ts` L112-116 |
| F10 | 🟡 | Unused duplicate of the Summary math, carries F2-class bug | `use-monthly-summary.ts` |
| F11 | 🟡 | Trend arrows hidden when previous period was exactly zero | `use-summary.ts` L209-214 |
| F12 | 🟡 | Sign-formatting helper's type doesn't cover give/take | `format.ts` L17-26 |
| F13 | 🟡 | A few stats computed but unused; would mislead if surfaced as-is | `use-summary.ts` L250-254 |

---

## 7. Suggested order of work (once you've weighed in above)

Not started — waiting on your answers to the decisions above.

- **P0 — fix first** (wrong money on the screen people check most): F1, F2
- **P1 — fix next** (screens actively disagree with each other): F3, F4
- **P2 — fix after that** (right most of the time, wrong at the edges): F6,
  F7, F8, F9
- **P3 — cleanup, whenever convenient** (no wrong number today): F5 (if you
  want the styling tweak), F10, F11, F12, F13

*End of report — no source files have been modified.*
